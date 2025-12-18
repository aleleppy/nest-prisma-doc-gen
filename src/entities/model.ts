import { Field, Model } from "../types.js";
import { DocGenDto } from "./dto-generator.js";
import { DocGenResponse } from "./response-generator.js";

export class DocGenModel {
  name: string;
  responses: DocGenResponse;
  dtos: DocGenDto;
  fields: Field[];

  constructor(model: Model) {
    this.name = model.name;
    this.fields = model.fields;

    this.responses = new DocGenResponse(model);
    this.dtos = new DocGenDto(model);
  }

  save() {
    this.responses.file.save();
    this.dtos.file.save();
  }
}
