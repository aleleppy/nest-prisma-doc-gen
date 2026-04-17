import { FieldType } from "../config.type.js";
import { Helper } from "../utils/helpers.js";
import type { DocGenField } from "./field.js";

/**
 * Builds the per-model `export namespace Input { ... }` block that groups
 * every field's Dto/Res type alias under its own sub-namespace.
 *
 * Output shape (for a User model with fields email, age):
 *   export namespace Input {
 *     export namespace Email {
 *       export type Dto = EmailDto;   export const Dto = EmailDto;
 *       export type Res = EmailRes;   export const Res = EmailRes;
 *     }
 *     export namespace Age { ... }
 *   }
 */
export class InputNamespaceBuilder {
  private fieldTypesByName = new Map<string, FieldType[]>();

  constructor(fields: DocGenField[]) {
    fields.forEach((field) => {
      const existing = this.fieldTypesByName.get(field.name) ?? [];
      existing.push(field.fieldType);
      this.fieldTypesByName.set(field.name, existing);
    });
  }

  build(): string {
    const entries = Array.from(this.fieldTypesByName).map(([fieldName, fieldTypes]) => {
      const name = Helper.capitalizeFirstSafe(fieldName);
      const typeDecls = fieldTypes
        .map((type) => {
          const capitalized = Helper.capitalizeFirstSafe(type);
          return `
            export type ${capitalized} = ${name + capitalized}
            export const ${capitalized} = ${name + capitalized}
          `;
        })
        .join(";");

      return `
        export namespace ${name} {
          ${typeDecls}
        }
      `;
    });

    return `
      export namespace Input {
        ${entries.join(";")}
      }
    `;
  }
}

/**
 * Builds the top-level `export namespace {Model} { ... }` block that exposes
 * Dto/Res/Id aliases plus the nested Input namespace.
 */
export function buildModelNamespace(modelName: string, inputNamespaceBlock: string): string {
  return `
    export namespace ${modelName} {
      export const Dto = ${modelName}Dto;
      export type Dto = ${modelName}Dto;
      export const Res = ${modelName}Res;
      export type Res = ${modelName}Res;
      export const Id = ${modelName}Id;
      export type Id = ${modelName}Id;
      ${inputNamespaceBlock}
    }
  `;
}
