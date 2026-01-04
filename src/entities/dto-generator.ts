import { Helper } from "../utils/helpers.js";
import { Static } from "../static.js";
import { Model } from "../types.js";
import { DocGenField } from "./field.js";
import { config } from "../utils/loader.js";

export class DocGenDto {
  name: string;
  // file: DocGenFile;
  fields: DocGenField[] = [];
  imports = new Set([`${Static.AUTO_GENERATED_COMMENT}`, `import { ApiProperty, IntersectionType } from '@nestjs/swagger'`]);
  classValidators = new Set<string>();
  enums = new Set<string>();

  constructor(model: Model) {
    this.name = model.name;

    this.classValidators.add("IsString");
    this.classValidators.add("IsNotEmpty");

    for (const field of model.fields) {
      if (field.isUpdatedAt || field.isId || field.name === "createdAt" || field.kind === "object") continue;

      this.fields.push(new DocGenField(field, "dto"));
    }
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

        return `class ${Helper.capitalizeFirstSafe(field.name)}Dto {
          ${field.build()}
        }`;
      })
      .join("\n\n");

    if (this.enums.size > 0) {
      this.classValidators.add("IsEnum");
      this.imports.add(`import { ${Array.from(this.enums)} } from '@prisma/client';`);
    }

    this.imports.add(`import { ${Array.from(this.classValidators)} } from '${config.validatorPath}';`);

    const intersections = this.fields.map((field) => Helper.capitalizeFirstSafe(field.name) + "Dto");

    return [
      `${Array.from(this.imports).join("\n")}`,
      `${sanitizedFields}`,
      `class ${this.name}Dto extends IntersectionType(${intersections.join(",")}) {
      }`,
      `class ${this.name}Id {
        @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
        @IsString()
        @IsNotEmpty()
        ${this.name.toLocaleLowerCase()}Id!: string;
      }
      `,
    ].join("\n\n");
  }
}
