import { ApiExampleBuilder, ValidatorBuilder } from "./config.type.js";

export class DocGenRules {
  ignore: string[];
  examples: Map<string, ApiExampleBuilder>;
  validators: Map<string, string[]>;
  validatorPath: string;

  constructor(params: {
    ignore: string[];
    examples: ApiExampleBuilder[];
    validators: ValidatorBuilder[];
    validatorPath: string;
  }) {
    const { examples, ignore, validators, validatorPath } = params;

    this.ignore = ignore;
    this.validatorPath = validatorPath;

    if (!validators.length) {
      console.warn("[doc-gen] Nenhum validator encontrado. Verifique seu docgen.config.ts*");
    }

    const allFields = validators.flatMap((validator) => validator.fields);
    const uniqueFieldsToValidate = [...new Set(allFields)];

    this.examples = new Map<string, ApiExampleBuilder>(
      examples.flatMap((builder) => builder.fields.map((field) => [field, builder]))
    );

    this.validators = new Map<string, string[]>(
      uniqueFieldsToValidate.map((field) => [
        field,
        validators.filter((validator) => validator.fields.includes(field)).map((validator) => validator.decorator),
      ])
    );
  }
}
