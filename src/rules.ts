import { ApiExampleBuilder, ExternalPrismaSchema, Inside, ValidatorBuilder } from "./config.type.js";

type ValidatorRules = { decorator: string; inside?: Inside }[];
export type Validators = Map<string, ValidatorRules>;

export class DocGenRules {
  ignore: string[];
  examples: Map<string, ApiExampleBuilder>;
  validators: Validators;
  validatorPath: string;
  prismaPath: string;
  outputPath: string;
  externalPrismaSchemas: ExternalPrismaSchema[];

  constructor(params: {
    ignore: string[];
    examples?: ApiExampleBuilder[];
    validators?: ValidatorBuilder[];
    validatorPath: string;
    prismaPath: string;
    outputPath: string;
    externalPrismaSchemas?: ExternalPrismaSchema[];
  }) {
    const { examples, ignore, validators, validatorPath, prismaPath, outputPath, externalPrismaSchemas } = params;

    this.prismaPath = prismaPath;
    this.outputPath = outputPath;
    this.externalPrismaSchemas = (externalPrismaSchemas ?? []).map((s) => new ExternalPrismaSchema(s.name, s.url, s.apiKey));

    this.ignore = ignore;
    this.validatorPath = validatorPath;

    this.examples = new Map<string, ApiExampleBuilder>(
      (examples ?? []).flatMap((builder) => builder.fields.map((field) => [field, builder])),
    );

    const validatorsByField = new Map<string, ValidatorRules>();

    (validators ?? []).forEach((validator) => {
      const { decorator, fields, inside } = validator;

      fields.forEach((field) => {
        if (!validatorsByField.has(field)) {
          validatorsByField.set(field, []);
        }

        validatorsByField.get(field)!.push({ decorator, inside });
      });
    });

    this.validators = validatorsByField;
  }
}
