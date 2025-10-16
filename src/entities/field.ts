import { Helper } from "../helpers/helpers.js";
import { config } from "../helpers/loader.js";
import { Static } from "../static.js";
import { FieldDefault, Scalar, FieldKind, FieldType, Field } from "../types.js";

const helpers = new Helper();
const rules = config;

export class DocGenField {
  name: string;
  isList: boolean;
  default?: FieldDefault | string;
  scalarType: Scalar;
  kind: FieldKind;

  type!: string;
  fieldType: FieldType;

  isEnum: boolean = false;
  isEntity: boolean = false;
  isUpdatedAt: boolean = false;
  isRequired: boolean;
  validators = new Set<string>();

  readonly scalarField: Field;

  constructor(field: Field, fieldType: FieldType) {
    const { name, isList, type, kind, isRequired, isUpdatedAt } = field;

    this.name = name;
    this.isList = isList;
    this.scalarType = type;
    this.kind = kind;
    this.isRequired = isRequired;
    this.scalarField = field;
    this.isUpdatedAt = isUpdatedAt;
    this.fieldType = fieldType;

    this.init();
  }

  private async init() {
    const validator = Helper.validatorForScalar(this.scalarType);
    if (validator !== "") this.validators.add(validator);

    this.setType();
    this.setValidators();
  }

  private setValidators() {
    if (this.scalarType === "String" && this.isRequired) {
      this.validators.add("IsNotEmpty");
    }

    if (this.isList) {
      this.validators.add("IsArray");
    }

    if (!this.isRequired) {
      this.validators.add("IsOptional");
    }

    const findedDecorators = rules.validators.get(this.name);

    if (findedDecorators) {
      findedDecorators.forEach((decorator) => {
        this.validators.add(decorator);
      });
    }
  }

  private setType() {
    if (this.kind === "enum") {
      this.isEnum = true;
      this.type = this.scalarType;
    } else if (this.kind === "object") {
      this.isEntity = true;
      this.type = `${this.scalarType}Entity`;
    } else if (this.kind === "scalar") {
      this.type = Helper.prismaScalarToTs(this.scalarType);
    }
  }

  private buildApiExample(): string[] {
    const fieldName = this.scalarField.name;
    const props: string[] = [];
    const scalarDbName = this.scalarField.dbName ?? "genericDbName";

    if (this.isEntity) {
      if (this.isList) {
        props.push(`example: [generateExample(${this.type})]`);
      } else {
        props.push(`example: generateExample(${this.type})`);
      }
    } else if (rules.examples.has(fieldName)) {
      props.push(`example: '${rules.examples.get(fieldName)?.example}'`);
    } else if (helpers.isDate(this.scalarField)) {
      props.push(`example: '2025-09-03T03:00:00.000Z'`);
    } else if (this.scalarField.isId || (this.scalarField.isReadOnly && scalarDbName.split("_").includes("id"))) {
      props.push(`example: 'cmfxu4njg000008l52v7t8qze'`);
    } else if (this.scalarField.type === "Boolean") {
      props.push(`example: true`);
    } else if (this.scalarField.kind === "enum") {
      props.push(`example: ${this.scalarField.type}[0]`);
    } else if (this.scalarField.type === "Int") {
      props.push(`example: ${Static.getRandomNumber()}`);
    }

    props.push(`required: ${this.scalarField.isRequired}`);
    return props;
  }

  private sanitizeValidators() {
    const sanitizedValidators = Array.from(this.validators).map((validator) => {
      return `@${validator}()`;
    });

    if (this.isEnum) {
      sanitizedValidators.push(`@IsEnum(${this.type})`);
    }

    return sanitizedValidators;
  }

  private buildInfos() {
    const key = this.isEnum ? "enum" : "type";

    const apiType = () => {
      if (this.type === "Date") return `'string'`;

      if (this.isList) {
        return `[${this.type}]`;
      } else if (this.isEnum) {
        return this.type;
      } else if (this.isEntity) {
        return `() => ${this.type}`;
      }

      return `'${this.type}'`;
    };

    const fieldType = () => {
      if (this.isList) {
        return `${this.type}[]`;
      } else {
        return this.type;
      }
    };
    const optionalFlag = this.isRequired ? "" : "?";

    const validators = this.sanitizeValidators();
    const apiExample = this.buildApiExample().join(", ");

    return {
      apiProperty: `@ApiProperty({ ${key}: ${apiType()}, ${apiExample} })`,
      validators,
      atributes: `${this.name}${optionalFlag}: ${fieldType()};`,
    };
  }

  build() {
    const { apiProperty, atributes, validators } = this.buildInfos();

    if (this.fieldType === "dto") {
      return [apiProperty, ...validators, atributes].join("\n");
    } else {
      return [apiProperty, atributes].join("\n");
    }
  }
}
