import { ApiExampleBuilder, Inside, ValidatorBuilder } from "./config.type.js";

type ValidatorRules = { decorator: string; inside?: Inside }[];
export type Validators = Map<string, ValidatorRules>;

export class DocGenRules {
  ignore: string[];
  examples: Map<string, ApiExampleBuilder>;
  validators: Validators;
  validatorPath: string;
  prismaPath: string;

  constructor(params: {
    ignore: string[];
    examples: ApiExampleBuilder[];
    validators: ValidatorBuilder[];
    validatorPath: string;
    prismaPath: string;
  }) {
    const { examples, ignore, validators, validatorPath, prismaPath } = params;

    this.prismaPath = prismaPath;

    this.ignore = ignore;
    this.validatorPath = validatorPath;

    if (!validators.length) {
      console.warn("[doc-gen] Nenhum validator encontrado. Verifique seu docgen.config.ts*");
    }

    this.examples = new Map<string, ApiExampleBuilder>(
      examples.flatMap((builder) => builder.fields.map((field) => [field, builder]))
    );

    const aaaValidators = new Map<string, ValidatorRules>();

    validators.forEach((validator) => {
      const { decorator, fields, inside } = validator;

      fields.forEach((field) => {
        if (!aaaValidators.has(field)) {
          aaaValidators.set(field, []);
        }

        aaaValidators.get(field)!.push({ decorator, inside });
      });
    });

    this.validators = aaaValidators;

    // this.validators = new Map<string, {decorator: string, inside?: Inside}>(

    // );
  }
}
