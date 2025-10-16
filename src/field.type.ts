import { DocGenFile } from "./file.js";
import { Static } from "./static.js";

export class DocFields {
  fields: string;
  file: DocGenFile;

  constructor(fields: string) {
    this.fields = fields;

    this.file = new DocGenFile({
      dir: "/",
      fileName: "fields.ts",
      data: this.build(),
    });
  }

  build() {
    const content = `
      ${Static.AUTO_GENERATED_COMMENT}
      export const FIELD_NAMES = [${this.fields}] as const
      export type FieldName = (typeof FIELD_NAMES)[number];
    `;

    return content;
  }
}
