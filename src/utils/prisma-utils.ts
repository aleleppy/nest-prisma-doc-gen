import { promises as fs } from "fs";
import * as path from "path";

export class PrismaUtils {
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
