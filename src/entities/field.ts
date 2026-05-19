import { FieldType, Inside } from "../config.type.js";
import { Helper } from "../utils/helpers.js";
import { config } from "../utils/loader.js";
import { Static } from "../static.js";
import { FieldDefault, Scalar, FieldKind, Field } from "../types.js";
import { Validator } from "./validator.js";

const helpers = new Helper();
const rules = config;

export class DocGenField {
  name: string;
  isArray: boolean;
  default?: FieldDefault | string;
  scalarType: Scalar;
  kind: FieldKind;

  type: string;
  fieldType: FieldType;

  isEnum: boolean = false;
  isJson: boolean = false;
  isResponse: boolean = false;
  isUpdatedAt: boolean = false;
  isRequired: boolean;
  validators = new Set<Validator>();

  readonly scalarField: Field;

  constructor(field: Field, fieldType: FieldType) {
    const { name, isList, type, kind, isRequired, isUpdatedAt } = field;

    this.name = name;
    this.isArray = isList;
    this.scalarType = type;
    this.kind = kind;
    this.isRequired = isRequired;
    this.scalarField = field;
    this.isUpdatedAt = isUpdatedAt;
    this.fieldType = fieldType;

    const resolved = DocGenField.resolveType(kind, type, fieldType);
    this.type = resolved.type;
    this.isEnum = resolved.isEnum;
    this.isResponse = resolved.isResponse;
    this.isJson = resolved.isJson;

    this.setValidators();
  }

  private static resolveType(
    kind: FieldKind,
    scalarType: Scalar,
    fieldType: FieldType,
  ): { type: string; isEnum: boolean; isResponse: boolean; isJson: boolean } {
    if (kind === "enum") {
      return { type: scalarType, isEnum: true, isResponse: false, isJson: false };
    }
    if (kind === "object") {
      return { type: `${scalarType}Res`, isEnum: false, isResponse: true, isJson: false };
    }
    if (scalarType === "Json") {
      const type = fieldType === "res" ? "Prisma.JsonValue" : "Prisma.InputJsonValue";
      return { type, isEnum: false, isResponse: false, isJson: true };
    }
    return {
      type: Helper.prismaScalarToTs(scalarType),
      isEnum: false,
      isResponse: false,
      isJson: false,
    };
  }

  private processValidator(params: { name: string; inside?: Inside }) {
    const validator = new Validator(params);
    if (this.isArray)
      validator.inside = {
        type: "number",
        content: "{ each: true }",
      };

    this.validators.add(validator);
  }

  private setValidators() {
    if (this.scalarType === "DateTime") {
      this.processValidator({ name: "IsDate" });

      const transformBody = this.isArray
        ? "({ value }) => Array.isArray(value) ? value.map((v) => (v == null || v === '' ? v : new Date(v))) : value"
        : "({ value }) => (value == null || value === '' ? value : new Date(value))";
      this.validators.add(
        new Validator({ name: "Transform", inside: { type: "number", content: transformBody } }),
      );
    } else if (this.scalarType === "String") {
      this.processValidator({ name: "IsString" });

      if (this.isRequired) {
        this.processValidator({ name: "IsNotEmpty" });
      }
    } else if (this.scalarType === "Json") {
      this.processValidator({ name: "IsJSON" });
    } else if (this.scalarType === "Boolean") {
      this.processValidator({ name: "IsBoolean" });
    } else if (
      this.scalarType === "Int" ||
      this.scalarType === "BigInt" ||
      this.scalarType === "Float" ||
      this.scalarType === "Decimal"
    ) {
      this.processValidator({ name: "IsNumber" });
    }

    if (this.isArray) {
      const validator = new Validator({ name: "IsArray" });
      this.validators.add(validator);
    }

    if (!this.isRequired) this.processValidator({ name: "IsOptional" });

    if (this.isEnum) {
      const content = this.isArray ? `${this.type}, { each: true } ` : this.type;

      this.validators.add(
        new Validator({
          name: "IsEnum",
          inside: {
            content,
            type: "number",
          },
        }),
      );
    }

    const findedDecorators = rules.validators.get(this.name);

    if (findedDecorators) {
      for (const props of findedDecorators) {
        const { decorator, inside } = props;
        this.processValidator({ name: decorator, inside: inside });
      }
    }
  }

  private getRuledExample(fieldName: string): string {
    const example = rules.examples.get(fieldName)?.example;

    if (example === undefined) {
      return `example: '${Static.DEFAULT_EXAMPLES.fallback}'`;
    }

    const isNumber = typeof example === "number";

    return isNumber ? `example: ${example}` : `example: '${example}'`;
  }

  private buildApiExample(): string[] {
    const fieldName = this.scalarField.name;
    const props: string[] = [];

    if (this.isResponse) {
      if (this.isArray) {
        props.push(`example: [generateExample(${this.type})]`);
      } else {
        props.push(`example: generateExample(${this.type})`);
      }
    } else if (rules.examples.get(fieldName)) {
      props.push(this.getRuledExample(fieldName));
    } else if (helpers.isDate(this.scalarField)) {
      props.push(`format: 'date-time', example: '${Static.DEFAULT_EXAMPLES.datetime}'`);
    } else if (this.scalarField.type === "Boolean") {
      props.push(`example: true`);
    } else if (this.scalarField.kind === "enum") {
      const example = [`example: Object.values(${this.scalarField.type}) ${this.isArray ? "" : "[0]"}`];
      props.push(example.join());
    } else if (this.scalarField.type === "Int") {
      props.push(`example: ${Static.DEFAULT_EXAMPLES.int}`);
    } else if (
      this.scalarField.type === "String" &&
      (this.scalarField.isId || Helper.splitByUpperCase(this.scalarField.name).includes("Id"))
    ) {
      props.push(`example: '${Static.DEFAULT_EXAMPLES.cuid}'`);
    } else if (this.scalarField.type === "String") {
      props.push(`example: '${Static.DEFAULT_EXAMPLES.string}'`);
    }

    if (this.isJson) {
      props.push(`additionalProperties: true`);
    } else {
      props.push(`required: ${this.scalarField.isRequired}`);
      if (!this.scalarField.isRequired) {
        props.push(`nullable: true`);
      }
    }

    return props;
  }

  private sanitizeValidators() {
    const sanitizedValidators = Array.from(this.validators).map((validator) => {
      return validator.build();
    });

    return sanitizedValidators;
  }

  private buildInfos() {
    const key = this.isEnum ? "enum" : "type";

    const apiType = () => {
      if (this.isJson) return `'object'`;
      if (this.type === "Date") return `'string'`;

      if (this.isArray && this.isResponse) {
        return `[${this.type}]`;
      } else if (this.isEnum) {
        return `${this.type}`;
      } else if (this.isResponse) {
        return `() => ${this.type}`;
      }

      return `'${this.type}'`;
    };

    const fieldType = () => {
      if (this.isArray) {
        return `${this.type}[]`;
      } else if (!this.isRequired && this.fieldType === "res") {
        return `${this.type} | null`;
      } else {
        return this.type;
      }
    };
    let optionalFlag = "?";
    if (this.isRequired || this.fieldType === "res") optionalFlag = "!";

    const validators = this.sanitizeValidators();
    const apiExample = this.buildApiExample().join(", ");

    return {
      apiProperty: `@ApiProperty({ ${key}: ${apiType()}, ${apiExample}, ${this.isArray ? "isArray: true" : ""} })`,
      validators,
      atributes: `${this.name}${optionalFlag}: ${fieldType()};`,
    };
  }

  build() {
    const { apiProperty, atributes, validators } = this.buildInfos();

    if (this.fieldType === "dto") {
      return [apiProperty, ...validators, atributes].join("\n");
    } else {
      return [apiProperty, "@Expose()", atributes].join("\n");
    }
  }
}
