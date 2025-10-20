export type FieldType = "entity" | "dto";
type ExampleType = string | boolean | number;

export class ValidatorBuilder {
  decorator: string;
  fields: string[];

  constructor(decorator: string, fields: string[]) {
    this.decorator = decorator;
    this.fields = fields;
  }
}

export class ApiExampleBuilder {
  fields: string[];
  example: string | boolean | number;

  constructor(fields: string[], example: ExampleType) {
    this.fields = fields;
    this.example = example;
  }
}

export type Rules = {
  ignore: string[];
  examples: ApiExampleBuilder[];
  validators: ValidatorBuilder[];
};
