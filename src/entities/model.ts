import { Field, Model } from "../types.js";
import { DocGenDto } from "./dto-generator.js";
import { DocGenEntity } from "./entity-generator.js";

export class DocGenModel {
  name: string;
  entitie: DocGenEntity;
  createDtos: DocGenDto;
  fields: Field[];

  constructor(model: Model) {
    this.name = model.name;
    this.fields = model.fields;

    this.entitie = new DocGenEntity(model);
    this.createDtos = new DocGenDto(model);
  }

  save() {
    this.entitie.file.save();
    this.createDtos.file.save();
  }
}
