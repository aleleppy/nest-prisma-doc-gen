import { Helper } from "../utils/helpers.js";
import { Static } from "../static.js";
import { Model } from "../types.js";
import { DocGenField } from "./field.js";
import { config } from "../utils/loader.js";

export class DocGenDto {
  name: string;
  fields: DocGenField[] = [];
  imports = new Set([
    `${Static.AUTO_GENERATED_COMMENT}`,
    "/* eslint-disable @typescript-eslint/no-namespace */",
    `import { ApiProperty, IntersectionType } from '@nestjs/swagger'`,
    `import { Expose } from 'class-transformer'`,
  ]);
  classValidators = new Set<string>();
  enums = new Set<string>();
  hasJson: boolean = false;
  enumImportPath: string;
  mainEnumNames: Set<string>;

  constructor(model: Model, enumImportPath?: string, mainEnumNames?: Set<string>) {
    this.name = model.name;
    this.enumImportPath = enumImportPath ?? "@prisma/client";
    this.mainEnumNames = mainEnumNames ?? new Set();

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
        if (field.isJson) this.hasJson = true;

        return `class ${Helper.capitalizeFirstSafe(field.name)}Dto {
          ${field.build()}
        }`;
      })
      .join("\n\n");

    if (this.enums.size > 0) {
      this.classValidators.add("IsEnum");

      const localEnums = Array.from(this.enums).filter((e) => !this.mainEnumNames.has(e));
      const prismaEnums = Array.from(this.enums).filter((e) => this.mainEnumNames.has(e));

      if (localEnums.length > 0) {
        this.imports.add(`import { ${localEnums.join(", ")} } from '${this.enumImportPath}';`);
      }
      const prismaNamedImports = [...prismaEnums, ...(this.hasJson ? ["Prisma"] : [])];
      if (prismaNamedImports.length > 0) {
        this.imports.add(`import { ${prismaNamedImports.join(", ")} } from '@prisma/client';`);
      }
    } else if (this.hasJson) {
      this.imports.add(`import { Prisma } from '@prisma/client';`);
    }

    this.imports.add(`import { ${Array.from(this.classValidators)} } from '${config.validatorPath}';`);

    const intersections = this.fields.map((field) => Helper.capitalizeFirstSafe(field.name) + "Dto");

    const intersectionClassName = `class ${this.name}Dto`;

    const intersectionClass =
      intersections.length > 0
        ? `${intersectionClassName} extends IntersectionType(${intersections.join(",")}) {}`
        : `${intersectionClassName}{}`;

    return [
      `${Array.from(this.imports).join("\n")}`,
      `${sanitizedFields}`,
      `${intersectionClass}`,
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
