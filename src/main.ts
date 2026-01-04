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
// import { Helper } from "./utils/helpers.js";

const { getDMMF } = prismaPkg;

const ROOT = process.cwd();
const PRISMA_DIR = path.join(ROOT, "src");

export class DocGen {
  datamodel!: string;
  properties!: Set<string>;
  // enums!: DocEnums;
  fields!: DocFields;
  models!: DocGenModel[];
  generic = new DocGenGeneric();
  indexFile!: DocGenFile;
  // fieldFile!: DocGenFile;

  async init() {
    const prismaDataModel = await PrismaUtils.readPrismaFolderDatamodel(PRISMA_DIR);
    const { datamodel } = await getDMMF({ datamodel: prismaDataModel });

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

    indexFileData.push("export * as DG from 'src/types/docgen/index';");

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
