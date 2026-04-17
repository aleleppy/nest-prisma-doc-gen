import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";
import { config } from "./utils/loader.js";
import { validateTsSyntax } from "./utils/ts-validator.js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, config.outputPath);

let prettierConfigWarned = false;

export class DocGenFile {
  outDir: string;
  data: string;

  constructor(params: { fileName: string; dir: string; data: string; customDir?: string }) {
    const { fileName, dir, data, customDir } = params;

    this.outDir = path.join(OUT_DIR, dir, fileName);
    this.data = data;

    if (customDir) this.outDir = customDir;
  }

  async save() {
    const dir = path.dirname(this.outDir);
    await fs.mkdir(dir, { recursive: true });

    if (this.outDir.endsWith(".ts")) {
      await validateTsSyntax(this.data, this.outDir);
    }

    const prettierConfig = await prettier.resolveConfig(this.outDir);
    if (!prettierConfig && !prettierConfigWarned) {
      console.warn(
        "⚠️  Nenhum .prettierrc encontrado — código gerado usará defaults do Prettier. " +
          "Adicione um config no projeto para garantir formatação consistente.",
      );
      prettierConfigWarned = true;
    }

    const formatted = await prettier.format(this.data, {
      ...prettierConfig,
      filepath: this.outDir,
    });

    await fs.writeFile(this.outDir, formatted, "utf-8");
  }
}
