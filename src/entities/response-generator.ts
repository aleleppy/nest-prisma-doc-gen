import { Model } from "../types.js";
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

        return field.build();
      })
      .join("\n\n");
    return [
      `class ${this.name}Res {
        ${sanitizedFields}
      }`,
    ].join("\n\n");
  }
}
