import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "src/types/docgen");

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

    const prettierConfig = await prettier.resolveConfig(this.outDir);

    const formatted = await prettier.format(this.data, {
      ...prettierConfig,
      filepath: this.outDir,
    });

    await fs.writeFile(this.outDir, formatted, "utf-8");
  }
}
