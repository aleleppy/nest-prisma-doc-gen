import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Agora os caminhos estão corretos porque estamos fora da src/
const src = path.join(__dirname, "../schemas/config.schema.json");
const destDir = path.join(__dirname, "../dist/schemas");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, "config.schema.json"));
