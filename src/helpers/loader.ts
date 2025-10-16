import "tsx/esm";
import { pathToFileURL } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { DocGenRules } from "../rules.js";
import { ApiExampleBuilder, DocGenParams } from "../types.js";

export class DocGenConfig {
  public readonly ignore: string[];
  public readonly examples: Map<string, ApiExampleBuilder>;
  public readonly validators: Map<string, string[]>;

  constructor(configs: DocGenRules) {
    const { examples, ignore, validators } = configs;
    this.ignore = ignore;
    this.examples = examples;
    this.validators = validators;
  }

  /**
   * Carrega o arquivo doc-gen.config.ts|.js da raiz do projeto.
   */
  static async load(): Promise<DocGenConfig> {
    const ROOT = process.cwd();
    const CONFIG_PATH_TS = path.join(ROOT, "doc-gen.config.mts");
    const CONFIG_PATH_JS = path.join(ROOT, "doc-gen.config.mjs");

    let configFile: string | undefined;
    if (fs.existsSync(CONFIG_PATH_TS)) configFile = CONFIG_PATH_TS;
    else if (fs.existsSync(CONFIG_PATH_JS)) configFile = CONFIG_PATH_JS;

    if (!configFile) {
      console.warn("⚠️ Nenhum arquivo doc-gen.config.ts|.js encontrado. Usando configuração vazia.");
      return this.newEmpty();
    }

    await import("tsx/esm");
    const imported = await import(pathToFileURL(configFile).href);

    const rules = imported.rules as DocGenParams | undefined;
    if (!rules) {
      console.warn("⚠️ O arquivo doc-gen.config.ts|.js não exporta 'rules'.");
      return this.newEmpty();
    }

    return this.newWithConfigs(rules);
  }

  /** Cria uma instância vazia */
  private static newEmpty() {
    return new DocGenConfig(new DocGenRules({ ignore: [], examples: [], validators: [] }));
  }

  /** Cria uma instância a partir de configurações */
  private static newWithConfigs(params: DocGenParams) {
    return new DocGenConfig(new DocGenRules(params));
  }
}

export const config = await DocGenConfig.load();
