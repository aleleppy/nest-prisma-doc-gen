export type FieldType = "res" | "dto";
type ExampleType = string | boolean | number;

export interface Inside {
  type: "string" | "number";
  content: string | number;
}

export class ValidatorBuilder {
  decorator: string;
  inside?: Inside;
  fields: string[];

  constructor(decorator: string, fields: string[], inside?: Inside) {
    this.decorator = decorator;
    this.fields = fields;
    this.inside = inside;
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
