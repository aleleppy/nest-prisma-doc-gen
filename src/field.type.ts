import { DocGenFile } from "./file.js";
import { Static } from "./static.js";

export class DocFields {
  fields: string[];
  file: DocGenFile;

  constructor(fields: string[]) {
    this.fields = fields;

    this.file = new DocGenFile({
      dir: "/",
      fileName: "fields.ts",
      data: this.build(),
    });
  }

  build() {
    const quoted = this.fields.map((name) => `'${name}'`).join(", ");
    return `
      ${Static.AUTO_GENERATED_COMMENT}
      export const FIELD_NAMES = [${quoted}] as const
      export type FieldName = (typeof FIELD_NAMES)[number];
    `;
  }
}
