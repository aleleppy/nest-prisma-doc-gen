#!/usr/bin/env node
import * as path from "node:path";

import { DocGenModel } from "./entities/model.js";
import { DocFields } from "./field.type.js";
import { Model } from "./types.js";

import { PrismaUtils } from "./utils/prisma-utils.js";
import { DocGenGeneric } from "./entities/generic.js";
import { DocGenFile } from "./file.js";
import { DocGenField } from "./entities/field.js";
import { DocGenConfig, config } from "./utils/loader.js";
import { Helper } from "./utils/helpers.js";
import { Static } from "./static.js";
import { getDMMFFromSchema, getDMMFSafe } from "./utils/dmmf.js";

const ROOT = process.cwd();
const PRISMA_DIR = path.join(ROOT, config.prismaPath);

const CLI_FLAGS = {
  allowMissingTypes: process.argv.includes("--allow-missing-types"),
  continueOnFetchError: process.argv.includes("--continue-on-fetch-error"),
  debug: process.env.DEBUG === "1" || process.argv.includes("--debug"),
};

export class DocGen {
  datamodel!: string;
  properties!: Set<string>;
  fields!: DocFields;
  models!: DocGenModel[];
  generic = new DocGenGeneric();
  indexFile!: DocGenFile;

  externalIndexExports: string[] = [];

  async init() {
    const prismaDataModel = await PrismaUtils.readPrismaFolderDatamodel(PRISMA_DIR);
    const { datamodel } = await getDMMFFromSchema(prismaDataModel);

    // Busca e processa schemas externos (precisa do schema principal para resolver tipos)
    const externalSchemas = await PrismaUtils.fetchExternalSchemas(config.externalPrismaSchemas, {
      continueOnError: CLI_FLAGS.continueOnFetchError,
    });
    const mainModelNames = new Set(datamodel.models.map((m) => m.name));
    const mainEnumNames = new Set(datamodel.enums.map((e) => e.name));

    for (const external of externalSchemas) {
      await this.processExternalSchema(external.name, external.prismaSchema, prismaDataModel, mainModelNames, mainEnumNames);
    }

    const fieldNames = new Set<string>();

    for (const model of datamodel.models) {
      for (const field of model.fields) {
        fieldNames.add(field.name);
      }
    }

    this.fields = new DocFields([...fieldNames]);

    this.models = datamodel.models.map((model) => {
      return new DocGenModel(model as Model);
    });

    this.build();
  }

  async processExternalSchema(
    name: string,
    prismaSchema: string,
    mainPrismaDataModel: string,
    mainModelNames: Set<string>,
    mainEnumNames: Set<string>,
  ) {
    // Remove blocos datasource/generator e definições duplicadas do schema externo
    const allMainNames = new Set([...mainModelNames, ...mainEnumNames]);
    let cleanedExternal = prismaSchema
      .replaceAll(/datasource\s+\w+\s*\{[^}]*\}/g, "")
      .replaceAll(/generator\s+\w+\s*\{[^}]*\}/g, "");

    // Remove models/enums que já existem no schema principal
    for (const typeName of allMainNames) {
      cleanedExternal = cleanedExternal.replaceAll(new RegExp(`(?:model|enum)\\s+${typeName}\\s*\\{[^}]*\\}`, "g"), "");
    }

    // Combina com o schema principal para que o Prisma resolva todos os tipos
    const combined = mainPrismaDataModel + "\n" + cleanedExternal;
    const { datamodel } = await getDMMFSafe(combined, name, {
      allowMissingTypes: CLI_FLAGS.allowMissingTypes,
    });

    const servicePrefix = Helper.toKebab(name);
    const serviceIndexExports: string[] = [];

    // Filtra apenas models e enums do schema externo (ignora os do principal)
    const externalModels = datamodel.models.filter((m: { name: string }) => !mainModelNames.has(m.name));
    const externalEnums = datamodel.enums.filter((e: { name: string }) => !mainEnumNames.has(e.name));

    // Gerar enums.ts com os enums do schema externo
    if (externalEnums.length > 0) {
      const enumDeclarations = externalEnums
        .map((e) => {
          const values = e.values.map((v: { name: string }) => `  ${v.name} = '${v.name}'`).join(",\n");
          return `export enum ${e.name} {\n${values}\n}`;
        })
        .join("\n\n");

      const enumFileData = [Static.AUTO_GENERATED_COMMENT, enumDeclarations].join("\n\n");

      const enumFile = new DocGenFile({
        dir: `/${servicePrefix}`,
        fileName: "enums.ts",
        data: enumFileData,
      });

      enumFile.save();
    }

    for (const model of externalModels) {
      const docModel = new DocGenModel(model as Model, servicePrefix, mainEnumNames);
      serviceIndexExports.push(...docModel.exports);
      docModel.save();
    }

    // Index do serviço: src/types/docgen/{servicePrefix}/index.ts
    const serviceIndexFile = new DocGenFile({
      dir: `/${servicePrefix}`,
      fileName: "index.ts",
      data: serviceIndexExports.join("\n"),
    });

    serviceIndexFile.save();

    // Export no index principal: export * as DG_TRANSACTION from './transaction/index'
    const aliasName = `DG_${name.toUpperCase()}`;
    this.externalIndexExports.push(`export * as ${aliasName} from './${servicePrefix}/index'`);

    console.log(`📦 Gerados ${externalModels.length} models para '${name}'.`);
  }

  build() {
    this.generic.build();
    this.fields.file.save();

    const indexFileData: string[] = [];

    const fields: DocGenField[] = [];

    for (const model of this.models) {
      indexFileData.push(...model.exports);

      fields.push(...model.dto.fields);

      model.save();
    }

    indexFileData.push(...this.externalIndexExports);
    indexFileData.push(`export * as DG from '../docgen';`);

    const fieldMap = new Map<string, DocGenField>();

    for (const field of fields) {
      if (fieldMap.has(field.name)) continue;

      fieldMap.set(field.name, field);
    }

    this.indexFile = new DocGenFile({
      fileName: "index.ts",
      dir: "",
      data: indexFileData.join("\n"),
    });

    this.indexFile.save();
  }
}

async function run() {
  // Revalida a config ao entrar na CLI — loader.ts carrega no import, mas
  // chamar de novo garante que erros sejam tratados aqui, não no top-level.
  await DocGenConfig.load();

  const generator = new DocGen();
  await generator.init();
  console.log("✅ DTOs gerados com sucesso!");
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`❌ Erro ao gerar DTOs: ${message}`);
  if (CLI_FLAGS.debug && err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
