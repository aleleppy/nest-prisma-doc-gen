#!/usr/bin/env node
import * as path from "node:path";

import { DocGenModel } from "./entities/model.js";
import { DocFields } from "./field.type.js";
import { Model } from "./types.js";

import prismaPkg from "@prisma/internals";
import { PrismaUtils } from "./utils/prisma-utils.js";
import { DocGenGeneric } from "./entities/generic.js";

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

  async init() {
    const prismaDataModel = await PrismaUtils.readPrismaFolderDatamodel(PRISMA_DIR);
    const { datamodel } = await getDMMF({ datamodel: prismaDataModel });

    // this.enums = new DocEnums(
    //   datamodel.enums.map(({ dbName, name, values }) => {
    //     return new DocGenEnum({
    //       dbName: dbName ?? "",
    //       name,
    //       values: values as EnumValue[],
    //     });
    //   })
    // );

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
    for (const model of this.models) {
      model.save();
    }
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
