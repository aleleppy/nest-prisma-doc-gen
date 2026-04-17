import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ExternalPrismaSchema } from "../config.type.js";

const FETCH_TIMEOUT_MS = 30_000;
const FETCH_RETRIES = 2;
const FETCH_BACKOFF_MS = 1_000;

type FetchOptions = {
  /** Se true, falha de um schema apenas loga e continua. Default: false (fail-fast). */
  continueOnError?: boolean;
  /** Timeout por request em ms. Default: 30000. */
  timeoutMs?: number;
};

export class PrismaUtils {
  static async fetchExternalSchemas(
    schemas: ExternalPrismaSchema[],
    options: FetchOptions = {},
  ): Promise<{ name: string; prismaSchema: string }[]> {
    const results: { name: string; prismaSchema: string }[] = [];
    if (!schemas.length) return results;

    const { continueOnError = false, timeoutMs = FETCH_TIMEOUT_MS } = options;

    for (const schema of schemas) {
      try {
        const prismaSchema = await PrismaUtils.fetchOneWithRetry(schema, timeoutMs);
        console.log(`📄 Schema externo '${schema.name}' carregado com sucesso.`);
        results.push({ name: schema.name, prismaSchema });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (continueOnError) {
          console.error(`❌ Erro em '${schema.name}' (continue-on-error): ${message}`);
          continue;
        }
        throw new Error(
          `Falha ao buscar schema externo '${schema.name}' (${schema.url}): ${message}\n` +
            `→ Rode com --continue-on-fetch-error para ignorar falhas e seguir com output parcial.`,
        );
      }
    }

    return results;
  }

  private static async fetchOneWithRetry(schema: ExternalPrismaSchema, timeoutMs: number): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = FETCH_BACKOFF_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
        console.warn(`🔁 Tentativa ${attempt + 1}/${FETCH_RETRIES + 1} para '${schema.name}'...`);
      }

      try {
        return await PrismaUtils.fetchOne(schema, timeoutMs);
      } catch (err) {
        lastError = err;
        // Erros de conteúdo (schema inválido) não valem retry
        if (err instanceof Error && err.name === "SchemaShapeError") throw err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private static async fetchOne(schema: ExternalPrismaSchema, timeoutMs: number): Promise<string> {
    const apiKey = schema.resolveApiKey();
    const headers: Record<string, string> = {};
    if (apiKey) headers["api-key"] = apiKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(schema.url, { headers, signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as { data?: { prisma?: unknown } };
      const prismaSchema = json?.data?.prisma;

      if (typeof prismaSchema !== "string" || !prismaSchema.trim()) {
        const err = new Error(`resposta não contém campo 'data.prisma' válido`);
        err.name = "SchemaShapeError";
        throw err;
      }

      return prismaSchema;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`timeout após ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async readPrismaFolderDatamodel(dir: string): Promise<string> {
    const prismaFiles: string[] = [];

    const walk = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === "migrations") continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".prisma")) {
          prismaFiles.push(fullPath);
        }
      }
    };

    await walk(dir);

    if (!prismaFiles.length) return "";

    prismaFiles.sort((a, b) => {
      const aIsMain = path.basename(a) === "main.prisma";
      const bIsMain = path.basename(b) === "main.prisma";

      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;

      return a.localeCompare(b);
    });

    const chunks: string[] = [];

    for (const file of prismaFiles) {
      const content = await fs.readFile(file, "utf-8");
      chunks.push(`\n// ---- ${file} ----\n${content}`);
    }

    return chunks.join("\n");
  }
}
