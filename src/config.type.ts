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

export class ExternalPrismaSchema {
  name: string;
  url: string;
  apiKey?: string;

  constructor(name: string, url: string, apiKey?: string) {
    this.name = name;
    this.url = url;
    this.apiKey = apiKey;
  }

  /** Resolve apiKey: se começa com '$', busca de process.env; senão, retorna literal */
  resolveApiKey(): string | undefined {
    if (!this.apiKey) return undefined;
    if (this.apiKey.startsWith("$")) {
      const envVar = this.apiKey.slice(1);
      return process.env[envVar];
    }
    return this.apiKey;
  }
}

export type Rules = {
  ignore: string[];
  examples: ApiExampleBuilder[];
  validators: ValidatorBuilder[];
};
