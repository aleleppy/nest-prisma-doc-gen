#!/usr/bin/env node
import * as path from "node:path";

import { DocGenModel } from "./entities/model.js";
import { DocFields } from "./field.type.js";
import { Model } from "./types.js";

import prismaPkg from "@prisma/internals";
import { PrismaUtils } from "./utils/prisma-utils.js";
import { DocGenGeneric } from "./entities/generic.js";
import { DocGenFile } from "./file.js";
import { DocGenField } from "./entities/field.js";
import { config } from "./utils/loader.js";
import { Helper } from "./utils/helpers.js";
import { Static } from "./static.js";

const { getDMMF } = prismaPkg;

const ROOT = process.cwd();
const PRISMA_DIR = path.join(ROOT, config.prismaPath);

export class DocGen {
  datamodel!: string;
  properties!: Set<string>;
  // enums!: DocEnums;
  fields!: DocFields;
  models!: DocGenModel[];
  generic = new DocGenGeneric();
  indexFile!: DocGenFile;
  // fieldFile!: DocGenFile;

  externalIndexExports: string[] = [];

  async init() {
    const prismaDataModel = await PrismaUtils.readPrismaFolderDatamodel(PRISMA_DIR);
    const { datamodel } = await getDMMF({ datamodel: prismaDataModel });

    console.log("starting2");
    // Busca e processa schemas externos (precisa do schema principal para resolver tipos)
    const externalSchemas = await PrismaUtils.fetchExternalSchemas(config.externalPrismaSchemas);
    const mainModelNames = new Set(datamodel.models.map((m) => m.name));
    const mainEnumNames = new Set(datamodel.enums.map((e) => e.name));

    for (const external of externalSchemas) {
      await this.processExternalSchema(external.name, external.prismaSchema, prismaDataModel, mainModelNames, mainEnumNames);
    }

    const fieldSet = new Set<string>();

    for (const model of datamodel.models) {
      for (const field of model.fields) {
        fieldSet.add(`'${field.name}'`);
      }
    }

    this.fields = new DocFields(Array.from(fieldSet).toString());

    this.models = datamodel.models.map((model) => {
      return new DocGenModel(model as Model);
    });

    this.build();
  }

  /**
   * Tenta getDMMF e, se falhar por tipos não encontrados, remove os campos
   * que referenciam esses tipos e retenta.
   */
  async getDMMFSafe(schema: string): Promise<Awaited<ReturnType<typeof getDMMF>>> {
    try {
      return await getDMMF({ datamodel: schema });
    } catch (err: any) {
      const message = err?.message ?? "";
      const missingTypes = [...message.matchAll(/Type "(\w+)" is neither a built-in type/g)].map(
        (m: RegExpMatchArray) => m[1],
      );

      if (missingTypes.length === 0) throw err;

      const uniqueTypes = [...new Set(missingTypes)];
      console.log(`⚠️  Removendo campos com tipos externos: ${uniqueTypes.join(", ")}`);

      // Remove linhas que referenciam os tipos desconhecidos
      const typePattern = uniqueTypes.join("|");
      const re = new RegExp(`^\\s+\\w+\\s+(${typePattern})[\\s\\[\\]\\?].*$`, "gm");
      const cleaned = schema.replaceAll(re, "");

      return await getDMMF({ datamodel: cleaned });
    }
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
      cleanedExternal = cleanedExternal.replaceAll(
        new RegExp(`(?:model|enum)\\s+${typeName}\\s*\\{[^}]*\\}`, "g"),
        "",
      );
    }

    // Combina com o schema principal para que o Prisma resolva todos os tipos
    const combined = mainPrismaDataModel + "\n" + cleanedExternal;
    const { datamodel } = await this.getDMMFSafe(combined);

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
    // const enumsSet = new Set<string>();
    // const classValidatorsSet = new Set<string>();

    for (const model of this.models) {
      indexFileData.push(...model.exports);

      fields.push(...model.dto.fields);

      // for (const e of model.dto.enums) {
      //   enumsSet.add(e);
      // }

      // for (const classValidator of model.dto.classValidators) {
      //   classValidatorsSet.add(classValidator);
      // }

      model.save();
    }

    indexFileData.push(...this.externalIndexExports);
    indexFileData.push(`export * as DG from '../docgen';`);

    const fieldMap = new Map<string, DocGenField>();

    for (const field of fields) {
      if (fieldMap.has(field.name)) continue;

      fieldMap.set(field.name, field);
    }

    // const imports = new Set([`import { ApiProperty } from '@nestjs/swagger'`]);
    // const validators = `import { ${Array.from(classValidatorsSet)} } from 'src/_nest/validators';`;

    // const exportTypes: string[] = [];

    // const fieldClasses = Array.from(fieldMap)
    //   .map(([_, field]) => {
    //     field.isRequired = true;
    //     const name = Helper.capitalizeFirstSafe(field.name);

    //     exportTypes.push(`
    //       export const ${name} = ${name}Dto
    //     `);

    //     return `
    //       class ${name}Dto {
    //         ${field.build()}
    //       }
    //     `;
    //   })
    //   .join("\n");

    // imports.add(`import { ${Array.from(enumsSet)} } from '@prisma/client';`);
    // imports.add(validators);

    // const teste = `
    //   export namespace Input {
    //     ${exportTypes.join(";")}
    //   }
    // `;

    // const fieldFileContent = [Array.from(imports).join("\n"), fieldClasses, teste];

    // this.fieldFile = new DocGenFile({
    //   fileName: "fields.types.ts",
    //   dir: "",
    //   data: fieldFileContent.join("\n"),
    // });

    this.indexFile = new DocGenFile({
      fileName: "index.ts",
      dir: "",
      data: indexFileData.join("\n"),
    });

    this.indexFile.save();
    // this.fieldFile.save();
  }
}

const generator = new DocGen();

try {
  await generator.init();
  console.log("✅ DTOs gerados com sucesso!");
} catch (err) {
  console.error("❌ Erro ao gerar DTOs:", err);
  process.exit(1);
}
