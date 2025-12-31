import { fileURLToPath } from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DocGenRules } from "../rules.js";
import { ApiExampleBuilder } from "../config.type.js";
import { DocGenParams } from "../types.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Caminho absoluto do diretório da lib (onde este arquivo está)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o schema dentro da lib
const SCHEMA_PATH = path.join(__dirname, "../schemas/config.schema.json");
const CONFIG_PATH = path.join(process.cwd(), "doc-gen.config.json");

export class DocGenConfig {
  public readonly ignore: string[];
  public readonly examples: Map<string, ApiExampleBuilder>;
  public readonly validators: Map<string, string[]>;
  public readonly validatorPath: string;

  constructor(configs: DocGenRules) {
    const { examples, ignore, validators, validatorPath } = configs;
    this.ignore = ignore;
    this.examples = examples;
    this.validators = validators;
    this.validatorPath = validatorPath;
  }

  private static async readJson(filePath: string) {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  }

  static async load() {
    // Lê os dois arquivos
    const [schema, config] = (await Promise.all([this.readJson(SCHEMA_PATH), this.readJson(CONFIG_PATH)])) as [any, DocGenParams];

    // Configura o validador
    const ajv = new Ajv.Ajv({ allErrors: true, strict: false });
    addFormats.default(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      const errors = (validate.errors ?? []).map((e) => `${e.instancePath || "(root)"} ${e.message}`).join("\n - ");
      throw new Error(`❌ Config inválida em ${path.basename(CONFIG_PATH)}:\n - ${errors}`);
    }

    console.log("✅ Configuração válida!");

    return DocGenConfig.newWithConfigs(config);
  }

  /** Cria uma instância a partir de configurações */
  private static newWithConfigs(params: DocGenParams) {
    return new DocGenConfig(new DocGenRules(params));
  }
}

export const config = await DocGenConfig.load();
