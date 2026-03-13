import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ExternalPrismaSchema } from "../config.type.js";

export class PrismaUtils {
  static async fetchExternalSchemas(
    schemas: ExternalPrismaSchema[]
  ): Promise<{ name: string; prismaSchema: string }[]> {
    const results: { name: string; prismaSchema: string }[] = [];
    if (!schemas.length) return results;

    for (const schema of schemas) {
      const apiKey = schema.resolveApiKey();

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["api-key"] = apiKey;
      }

      try {
        const response = await fetch(schema.url, { headers });

        if (!response.ok) {
          console.error(`❌ Falha ao buscar schema externo (${response.status}): ${schema.url}`);
          continue;
        }

        const json = await response.json();
        const prismaSchema = json?.data?.prisma;

        if (!prismaSchema || typeof prismaSchema !== "string") {
          console.error(`❌ Schema externo '${schema.name}' não contém data.prisma válido.`);
          continue;
        }

        console.log(`📄 Schema externo '${schema.name}' carregado com sucesso.`);
        results.push({ name: schema.name, prismaSchema });
      } catch (err) {
        console.error(`❌ Erro ao buscar schema externo '${schema.name}': ${schema.url}`, err);
      }
    }

    return results;
  }

  static async readPrismaFolderDatamodel(dir: string): Promise<string> {
    const prismaFiles: string[] = [];

    // percorre recursivamente e guarda TODOS os .prisma (exceto dentro de migrations)
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

    // garantir que main.prisma (se existir) venha primeiro
    prismaFiles.sort((a, b) => {
      const aIsMain = path.basename(a) === "main.prisma";
      const bIsMain = path.basename(b) === "main.prisma";

      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;

      // fallback: ordem alfabética estável
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
