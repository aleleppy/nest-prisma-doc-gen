import { DocGenFile } from "../file.js";
import { Helper } from "../utils/helpers.js";
import { Static } from "../static.js";
import { Model } from "../types.js";
import { DocGenField } from "./field.js";

export class DocGenEntity {
  name: string;
  file: DocGenFile;
  fields: DocGenField[] = [];
  imports = new Set([`${Static.AUTO_GENERATED_COMMENT}`, `import { ApiProperty } from '@nestjs/swagger'`]);
  enums = new Set<string>();

  constructor(model: Model) {
    this.name = model.name;

    for (const field of model.fields) {
      if (field.kind === "object") continue;

      this.fields.push(new DocGenField(field, "entity"));
    }

    this.file = new DocGenFile({
      dir: "/entity",
      fileName: `${Helper.toKebab(this.name)}.entity.ts`,
      data: this.build(),
    });
  }

  build() {
    const sanitizedFields = this.fields
      .map((field) => {
        if (field.isEntity) {
          this.imports.add(`import { ${field.type} } from './${Helper.toKebab(field.scalarType)}.entity'`);
          this.imports.add(`import { generateExample } from 'src/utils/functions/reflect'`);
        } else if (field.isEnum) {
          this.enums.add(field.type);
        }

        return field.build();
      })
      .join("\n\n");

    if (this.enums.size > 0) {
      this.imports.add(`import { ${Array.from(this.enums)} } from '../enums';`);
    }

    return [
      `${Array.from(this.imports).join("\n")}`,
      `export class ${this.name}Entity {
        ${sanitizedFields}
      }`,
    ].join("\n\n");
  }
}
