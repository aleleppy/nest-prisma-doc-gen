import { Model } from "../types.js";
import { Helper } from "../utils/helpers.js";
import { DocGenField } from "./field.js";

export class DocGenResponse {
  name: string;
  // file: DocGenFile;
  fields: DocGenField[] = [];
  enums = new Set<string>();

  constructor(model: Model) {
    this.name = model.name;

    for (const field of model.fields) {
      if (field.kind === "object") continue;

      this.fields.push(new DocGenField(field, "res"));
    }
  }

  build() {
    const sanitizedFields = this.fields
      .map((field) => {
        if (field.isEnum) {
          this.enums.add(field.type);
        }

        return `class ${Helper.capitalizeFirstSafe(field.name)}Res {
          ${field.build()}
        }`;
      })
      .join("\n\n");

    const intersections = this.fields.map((field) => Helper.capitalizeFirstSafe(field.name) + "Res");
    return [`${sanitizedFields}`, `class ${this.name}Res extends IntersectionType(${intersections.join(",")}) {}`].join("\n\n");
  }
}
