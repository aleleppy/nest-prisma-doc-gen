import { DocGenFile } from "../file.js";
import { Helper } from "../utils/helpers.js";
import { Static } from "../static.js";
import { Model } from "../types.js";
import { DocGenField } from "./field.js";

export class DocGenDto {
  name: string;
  file: DocGenFile;
  fields: DocGenField[] = [];
  imports = new Set([
    `${Static.AUTO_GENERATED_COMMENT}`,
    `import { ApiProperty, IntersectionType } from '@nestjs/swagger'`,
    `import { DefaultIdDtoDG } from '../generic.dto'`,
  ]);
  classValidators = new Set<string>();
  enums = new Set<string>();

  constructor(model: Model) {
    this.name = model.name;

    for (const field of model.fields) {
      if (field.isUpdatedAt || field.isId || field.name === "createdAt" || field.kind === "object") continue;

      this.fields.push(new DocGenField(field, "dto"));
    }

    this.file = new DocGenFile({
      dir: "/dto",
      fileName: `${Helper.toKebab(this.name)}.dto.ts`,
      data: this.build(),
    });
  }

  build() {
    const sanitizedFields = this.fields
      .map((field) => {
        for (const { name } of field.validators) {
          this.classValidators.add(name);
        }

        if (field.isResponse) {
          this.imports.add(`import { ${field.type} } from '../entities/${Helper.toKebab(field.scalarType)}.response'`);
          this.imports.add(`import { generateExample } from 'src/utils/functions/reflect'`);
        } else if (field.isEnum) {
          this.enums.add(field.type);
        }

        return field.build();
      })
      .join("\n\n");

    if (this.enums.size > 0) {
      this.classValidators.add("IsEnum");
      this.imports.add(`import { ${Array.from(this.enums)} } from '@prisma/client';`);
    }

    this.imports.add(`import { ${Array.from(this.classValidators)} } from 'src/_core/validators';`);

    return [
      `${Array.from(this.imports).join("\n")}`,
      `export class ${this.name}DtoDG {
        ${sanitizedFields}
      }`,
      `export class ${this.name}WithIdDtoDG extends IntersectionType(
        ${this.name}DtoDG,
        DefaultIdDtoDG,
      ) {}`,
    ].join("\n\n");
  }
}
