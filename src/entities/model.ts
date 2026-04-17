import { DocGenFile } from "../file.js";
import { Field, Model } from "../types.js";
import { Helper } from "../utils/helpers.js";
import { DocGenDto } from "./dto-generator.js";
import { DocGenResponse } from "./response-generator.js";
import { InputNamespaceBuilder, buildModelNamespace } from "./namespace-builder.js";

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

    this.file = new DocGenFile({
      dir: servicePrefix ? `/${servicePrefix}/types` : "/types",
      fileName: `${fileName}.ts`,
      data: this.assembleSource(),
    });
  }

  /**
   * Builds the final source string: DTO class + Response class + namespace block.
   * Side effect: merges response.enums/hasJson into dto before emitting.
   */
  private assembleSource(): string {
    const inputNamespace = new InputNamespaceBuilder([...this.dto.fields, ...this.response.fields]).build();
    const modelNamespace = buildModelNamespace(this.name, inputNamespace);

    // Build response first to collect enums, then merge into DTO
    const responseResult = this.response.build();
    for (const e of this.response.enums) {
      this.dto.enums.add(e);
    }
    if (this.response.hasJson) this.dto.hasJson = true;
    const dtoResult = this.dto.build();

    return [dtoResult, responseResult, modelNamespace].join("");
  }

  save() {
    this.file.save();
  }
}
