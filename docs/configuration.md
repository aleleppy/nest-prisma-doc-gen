# Configuration Reference — doc-gen.config.json

The generator reads `doc-gen.config.json` from the **current working directory** (wherever you run `npx doc-gen`). The file is validated at startup against `schemas/config.schema.json` using AJV — invalid configs throw a detailed error and abort.

> Enable editor autocomplete by adding `"$schema"` to your config file (see examples below).

---

## Full Config Shape

```ts
{
  "$schema": "...",                       // optional — enables IDE autocomplete
  "ignore": string[],                     // REQUIRED
  "validatorPath": string,                // REQUIRED
  "prismaPath": string,                   // REQUIRED
  "outputPath": string,                   // REQUIRED
  "examples": ApiExampleBuilder[],        // REQUIRED (can be empty array)
  "validators": ValidatorBuilder[],       // REQUIRED (can be empty array)
  "externalPrismaSchemas": ExternalPrismaSchema[]  // optional
}
```

---

## Fields

### `ignore` — `string[]` (required)

Field names to skip during generation. These fields will not appear in any generated DTO or Response class.

Note: `id`, `isUpdatedAt`, `createdAt`, and `kind=object` (relations) are always excluded from DTOs automatically — you don't need to list them here.

```json
"ignore": ["createdAt", "updatedAt", "deletedAt"]
```

---

### `validatorPath` — `string` (required)

Import path used in the generated files for all `class-validator` decorators. Typically points to a barrel file that re-exports from `class-validator`.

```json
"validatorPath": "src/utils/validators"
```

The generated import will look like:
```ts
import { IsString, IsNotEmpty, IsEmail } from 'src/utils/validators';
```

---

### `prismaPath` — `string` (required)

Relative path (from project root) to the folder containing your `.prisma` schema files.

```json
"prismaPath": "prisma/schemas"
```

The generator recursively reads all `.prisma` files in this directory, skipping the `migrations/` subfolder. If `main.prisma` exists, it is loaded first.

---

### `outputPath` — `string` (required)

Relative path (from project root) where generated files are written.

```json
"outputPath": "src/types/docgen"
```

---

### `examples` — `ApiExampleBuilder[]` (required, can be `[]`)

Provides custom `@ApiProperty({ example: ... })` values for specific fields. Without a matching rule, the generator infers examples from the field's type.

**Shape:**
```ts
{
  "fields": string[],              // field names this example applies to
  "example": string | number | boolean  // the example value
}
```

**Examples:**
```json
"examples": [
  { "fields": ["email"], "example": "user@example.com" },
  { "fields": ["age", "score"], "example": 25 },
  { "fields": ["active"], "example": true }
]
```

If `example` is a number it is emitted as a bare number literal; otherwise it is wrapped in quotes.

**Default inference when no rule matches:**

| Field characteristic | Generated example |
|---|---|
| DateTime | `'2025-09-03T03:00:00.000Z'` |
| isId or name contains "Id" | `'cmfxu4njg000008l52v7t8qze'` |
| Boolean | `true` |
| enum | `Object.values(EnumName)[0]` |
| Int | `777` |
| String | `'ordinary string'` |
| relation (object) | `generateExample(TypeRes)` |

---

### `validators` — `ValidatorBuilder[]` (required, can be `[]`)

Attaches additional `class-validator` decorators to specific fields. These are added **on top of** the automatically inferred validators.

**Shape:**
```ts
{
  "decorator": string,    // decorator name, e.g. "IsEmail"
  "fields": string[],     // field names to apply it to
  "inside": {             // optional — arguments passed to the decorator
    "type": "string" | "number",
    "content": any
  }
}
```

**Examples:**
```json
"validators": [
  {
    "decorator": "IsEmail",
    "fields": ["email"]
  },
  {
    "decorator": "IsStrongPassword",
    "fields": ["password"],
    "inside": { "type": "number", "content": { "minLength": 8 } }
  },
  {
    "decorator": "Min",
    "fields": ["age"],
    "inside": { "type": "number", "content": 0 }
  }
]
```

The `inside.type` field controls how `content` is serialized in the generated decorator:
- `"number"` — content is emitted as-is (no quotes): `@Min(0)`, `@IsStrongPassword({ minLength: 8 })`
- `"string"` — content is emitted as a quoted string: `@Transform('value')`

---

### `externalPrismaSchemas` — `ExternalPrismaSchema[]` (optional)

Fetches remote Prisma schemas from HTTP endpoints and generates types under service-namespaced subfolders.

**Shape:**
```ts
{
  "name": string,      // service name, used as folder prefix (e.g. "transaction" → transaction/)
  "url": string,       // HTTP endpoint that returns { data: { prisma: "..." } }
  "apiKey": string     // optional; prefix with "$" to read from env var
}
```

**Examples:**
```json
"externalPrismaSchemas": [
  {
    "name": "transaction",
    "url": "https://api.internal/schema",
    "apiKey": "$TRANSACTION_API_KEY"
  },
  {
    "name": "notification",
    "url": "https://notify.internal/schema"
  }
]
```

The env var reference `"$MY_KEY"` resolves from `process.env.MY_KEY`, which is populated from the project's `.env` file before fetching.

Generated output structure per external service:
```
{outputPath}/
  {service-name}/
    types/
      {service-name}.{model-name}.ts
    enums.ts          (if service has enums)
    index.ts
```

The main `index.ts` re-exports the service namespace as `DG_{SERVICE_NAME}`:
```ts
export * as DG_TRANSACTION from './transaction/index';
```

---

## Minimal Configuration

```json
{
  "$schema": "./node_modules/prismadoc/schemas/config.schema.json",
  "ignore": [],
  "validatorPath": "class-validator",
  "prismaPath": "prisma",
  "outputPath": "src/types/docgen",
  "examples": [],
  "validators": []
}
```

---

## Full Configuration Example

```json
{
  "$schema": "./node_modules/prismadoc/schemas/config.schema.json",
  "ignore": ["createdAt", "updatedAt", "deletedAt"],
  "validatorPath": "src/utils/validators",
  "prismaPath": "prisma/schemas",
  "outputPath": "src/types/docgen",
  "examples": [
    { "fields": ["email"], "example": "user@example.com" },
    { "fields": ["name", "firstName", "lastName"], "example": "John Doe" },
    { "fields": ["cpf"], "example": "123.456.789-00" },
    { "fields": ["phone"], "example": "+55 11 99999-9999" },
    { "fields": ["amount"], "example": 150 }
  ],
  "validators": [
    { "decorator": "IsEmail", "fields": ["email"] },
    {
      "decorator": "IsStrongPassword",
      "fields": ["password"],
      "inside": { "type": "number", "content": { "minLength": 8 } }
    },
    { "decorator": "IsCPF", "fields": ["cpf"] },
    { "decorator": "IsPhoneNumber", "fields": ["phone"] }
  ],
  "externalPrismaSchemas": [
    {
      "name": "transaction",
      "url": "https://api.internal/prisma-schema",
      "apiKey": "$TRANSACTION_SCHEMA_API_KEY"
    }
  ]
}
```

---

## `DocGenRules` — Programmatic API

The library exports `DocGenRules` for programmatic use (e.g., generating config from code):

```ts
import { DocGenRules } from 'prismadoc';

const rules = new DocGenRules({
  ignore: ['createdAt', 'updatedAt'],
  validatorPath: 'src/utils/validators',
  prismaPath: 'prisma/schemas',
  outputPath: 'src/types/docgen',
  examples: [
    { fields: ['email'], example: 'user@example.com' }
  ],
  validators: [
    { decorator: 'IsEmail', fields: ['email'] }
  ],
  externalPrismaSchemas: [] // optional
});
```

`DocGenRules` converts the arrays into Maps for O(1) field lookups:
- `rules.examples` → `Map<fieldName, ApiExampleBuilder>`
- `rules.validators` → `Map<fieldName, { decorator, inside? }[]>`

---

## Validation Errors

If the config is invalid, the process exits with a message like:
```
❌ Config inválida em doc-gen.config.json:
 - /examples/0/fields must be array
 - /validators/1 must have required property 'decorator'
```

Fix the listed paths in your `doc-gen.config.json` and re-run.
