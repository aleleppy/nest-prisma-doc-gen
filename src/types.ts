import { ApiExampleBuilder, FieldType, ValidatorBuilder } from "./config.type.js";

export type FieldKind = "scalar" | "object" | "enum";
type FieldDefaultName = "now" | "autoincrement" | "cuid";

export type DbName = string | null;
export type Scalar = "String" | "Int" | "BigInt" | "Float" | "Decimal" | "Boolean" | "DateTime" | "Json" | "Bytes";

export type Field = {
  name: string;
  dbName: string;
  kind: FieldKind;
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  type: Scalar;

  isGenerated: boolean;
  isUpdatedAt: boolean;

  nativeType: any;
  default?: FieldDefault | string;
};

export interface FieldDefault {
  name: FieldDefaultName;
  args: number[];
}

export type DocGenModel = {
  name: string | null;
  dbName: string | null;
  schema: string | null;
  readonly fields: Field[];

  uniqueFields: string[][];
  uniqueIndexes: ModelUniqueIndexes[];
  primaryKey: null;

  documentation?: string;
  isGenerated?: boolean;
};

export type ModelUniqueIndexes = {
  name: string | null;
  fields: any[];
};

export type Model = {
  name: string;
  dbName: string | null;
  schema: string | null;
  readonly fields: Field[];

  uniqueFields: string[][];
  uniqueIndexes: ModelUniqueIndexes[];
  primaryKey: null;

  documentation?: string;
  isGenerated?: boolean;
};

export type ModelParams = { model: Model; examples: Map<string, ApiExampleBuilder>; validators: Map<string, string[]> };

export type FieldParams = {
  examples: Map<string, ApiExampleBuilder>;
  validators: Map<string, string[]>;
  field: Field;
  fieldType: FieldType;
};

export type DocGenParams = {
  ignore: string[];
  examples: ApiExampleBuilder[];
  validators: ValidatorBuilder[];
  validatorPath: string;
  prismaPath: string;
};
