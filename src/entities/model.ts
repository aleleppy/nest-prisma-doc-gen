import { FieldType } from "../config.type.js";
import { DocGenFile } from "../file.js";
import { Field, Model } from "../types.js";
import { Helper } from "../utils/helpers.js";
import { DocGenDto } from "./dto-generator.js";
import { DocGenResponse } from "./response-generator.js";

export class DocGenModel {
  name: string;
  response: DocGenResponse;
  dto: DocGenDto;
  fields: Field[];
  exports: string[];
  file: DocGenFile;
  servicePrefix?: string;

  constructor(model: Model, servicePrefix?: string, mainEnumNames?: Set<string>) {
    this.name = model.name;
    this.fields = model.fields;
    this.servicePrefix = servicePrefix;

    const enumImportPath = servicePrefix ? "../enums" : undefined;

    this.response = new DocGenResponse(model);
    this.dto = new DocGenDto(model, enumImportPath, mainEnumNames);

    const kebabName = Helper.toKebab(this.name);
    const fileName = servicePrefix ? `${servicePrefix}.${kebabName}` : kebabName;

    this.exports = [`export * from './types/${fileName}'`];

    const teste = new Map<string, FieldType[]>();

    const bla = [...this.dto.fields, ...this.response.fields];

    bla.forEach((field) => {
      let a = teste.get(field.name);

      if (!a) {
        a = [];
        teste.set(field.name, a);
      }

      a.push(field.fieldType);
    });

    const fdm = `
            export namespace Input {
          ${Array.from(teste)
            .map(([fieldName, fieldTypes]) => {
              const name = Helper.capitalizeFirstSafe(fieldName);
              const types = fieldTypes.map((type) => Helper.capitalizeFirstSafe(type));
              return `
              export namespace ${name} {
                ${types
                  .map((type) => {
                    return `
                    export type ${type} = ${name + type}
                    export const ${type} = ${name + type}
                  `;
                  })
                  .join(";")}
              }
            `;
            })
            .join(";")}
        }
    `;

    const intaaa = `
      export namespace ${this.name} {
        export const Dto = ${this.name}Dto;
        export type Dto = ${this.name}Dto;
        export const Res = ${this.name}Res;
        export type Res = ${this.name}Res;
        export const Id = ${this.name}Id;
        export type Id = ${this.name}Id;
            ${fdm}
      }
    `;

    // Build response primeiro para coletar enums, depois mergear no DTO
    const responseResult = this.response.build();
    for (const e of this.response.enums) {
      this.dto.enums.add(e);
    }
    const dtoResult = this.dto.build();

    const data = [dtoResult, responseResult, intaaa].join("");

    const fileDir = servicePrefix ? `/${servicePrefix}/types` : "/types";

    this.file = new DocGenFile({
      dir: fileDir,
      fileName: `${fileName}.ts`,
      data,
    });
  }

  save() {
    this.file.save();
  }
}
