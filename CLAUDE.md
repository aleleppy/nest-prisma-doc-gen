# CLAUDE.md — nest-prisma_doc-gen (prismadoc)

## Project Identity

- **npm package:** `prismadoc` (binary: `doc-gen`)
- **Version:** 1.0.37
- **Purpose:** CLI tool that auto-generates NestJS Swagger DTOs and Response classes from Prisma schemas. Eliminates boilerplate by reading `schema.prisma` and producing `@ApiProperty`-decorated TypeScript classes with `class-validator` integration.
- **Entry points:**
  - CLI: `src/main.ts` → compiled to `dist/main.js`
  - Library export: `src/index.ts` → exports `DocGenRules`

---

## Build & Dev Workflow

```bash
# Build (TypeScript → dist/)
npm run build        # runs tsc

# Run locally (after build)
node dist/main.js

# Run in a consumer project
npx doc-gen
```

No test framework is configured. Testing is manual: run `npx doc-gen` in a project that has `doc-gen.config.json` and a Prisma schema.

---

## Architecture at a Glance

```
src/
├── main.ts               # CLI: DocGen class — orchestrates the full pipeline
├── index.ts              # Library export: DocGenRules only
├── rules.ts              # DocGenRules — processes raw config into Maps/Sets
├── types.ts              # Core type definitions (Field, Model, Scalar, etc.)
├── config.type.ts        # Config builder types (ValidatorBuilder, ApiExampleBuilder, ExternalPrismaSchema)
├── field.type.ts         # DocFields — generates fields.ts constant file
├── static.ts             # AUTO_GENERATED_COMMENT constant
├── file.ts               # DocGenFile — file writing with Prettier formatting
│
├── entities/
│   ├── model.ts          # DocGenModel — orchestrates DTO + Response for one Prisma model
│   ├── dto-generator.ts  # DocGenDto — generates the DTO class (filtered fields + validators)
│   ├── response-generator.ts  # DocGenResponse — generates the Response class (all fields)
│   ├── field.ts          # DocGenField — generates one field (decorator + type declaration)
│   ├── validator.ts      # Validator — builds @DecoratorName() strings
│   ├── generic.ts        # DocGenGeneric — generates generic.dto.ts (DefaultIdDto)
│   └── enum.ts           # Mostly commented out — enum logic is handled inline
│
└── utils/
    ├── loader.ts         # DocGenConfig — loads & validates doc-gen.config.json via AJV
    ├── helpers.ts        # Helper — type mappings, string utilities
    ├── prisma-utils.ts   # PrismaUtils — reads .prisma files, fetches external schemas
    └── propeties.static.ts  # AUTO-GENERATED — do not edit manually
```

---

## Generation Pipeline

1. **Load config** — `loader.ts` reads `doc-gen.config.json`, validates against `schemas/config.schema.json` via AJV, loads `.env`
2. **Read schema** — `PrismaUtils.readPrismaFolderDatamodel()` recursively concatenates all `.prisma` files (skips `migrations/`, prioritizes `main.prisma`)
3. **Parse DMMF** — `@prisma/internals getDMMF()` produces the data model
4. **External schemas** — `PrismaUtils.fetchExternalSchemas()` fetches remote schemas via HTTP; each is merged with the main schema, cleaned of duplicates, and processed separately under its own subfolder (e.g., `transaction/`)
5. **Per-model generation** — for each Prisma model:
   - `DocGenResponse.build()` — produces `{Name}Res` class (all non-relation fields, `@Expose()`)
   - `DocGenDto.build()` — produces `{Name}Dto` class (excludes `id`, `isUpdatedAt`, `createdAt`, `kind=object` fields; adds validators)
   - `DocGenModel` assembles DTO + Response + namespace export (`User.Dto`, `User.Res`, `User.Id`, `User.Input.Email.Dto`, …)
6. **Generic classes** — `DocGenGeneric.build()` writes `generic.dto.ts` with `DefaultIdDto`
7. **Field constants** — `DocFields` writes `fields.ts` with all field names as a typed const
8. **Index file** — `DocGen.build()` writes `index.ts` re-exporting everything plus external service aliases (`DG_TRANSACTION`, etc.)
9. **Prettier** — `DocGenFile.save()` formats every file with Prettier before writing
10. **Output** — all files land in `{outputPath}/` (default: `src/types/docgen/`)

---

## Code Conventions

### Module system
- ESM (`"type": "module"` in package.json, `"module": "NodeNext"` in tsconfig)
- **All local imports must use `.js` extension**, even though the source is `.ts`:
  ```ts
  import { Helper } from "../utils/helpers.js"; // correct
  import { Helper } from "../utils/helpers";     // wrong — will fail at runtime
  ```
- Node built-ins use `node:` prefix: `import * as fs from "node:fs/promises"`

### Naming
| Scope | Convention | Example |
|---|---|---|
| Source files | kebab-case | `dto-generator.ts` |
| Internal classes | `DocGen{Entity}` | `DocGenModel`, `DocGenField` |
| Generated DTOs | `{Model}Dto` / `{Model}Res` / `{Model}Id` | `UserDto`, `UserRes`, `UserId` |
| Per-field classes | `{FieldName}Dto` / `{FieldName}Res` | `EmailDto`, `EmailRes` |
| External service aliases | `DG_{SERVICE}` | `DG_TRANSACTION` |

### The `build()` pattern
Every generator class exposes a `build()` method that returns a `string` of TypeScript source code. The caller assembles the strings and passes them to `DocGenFile.save()`.

### Field exclusion rules (DTO only)
Fields skipped when generating DTOs (not Responses):
- `field.isId === true`
- `field.isUpdatedAt === true`
- `field.name === "createdAt"`
- `field.kind === "object"` (relations)

### Validator assignment logic (`entities/field.ts`)
```
DateTime     → @IsDateString()
String / Json → @IsString() [+ @IsNotEmpty() if required]
Boolean      → @IsBoolean()
Int / BigInt / Float / Decimal → @IsNumber()
isList       → @IsArray() [+ each: true on type validator]
!isRequired  → @IsOptional()
isEnum       → @IsEnum(EnumType)
config rules → additional custom decorators per field name
```

---

## Type Mappings

| Prisma type | TypeScript type | Swagger type |
|---|---|---|
| `String` | `string` | `'string'` |
| `Int` | `number` | `'number'` |
| `BigInt` | `bigint` | `'integer'` |
| `Float` | `number` | `'number'` |
| `Decimal` | `number` | `'number'` |
| `Boolean` | `boolean` | `'boolean'` |
| `DateTime` | `Date` | `'string'` |
| `Json` | `object` | `'object'` |
| `Bytes` | `Buffer` | `'string'` (base64) |
| `enum` | enum name | enum name |
| `object` (relation) | `{Type}Res` | `() => {Type}Res` |

---

## External Schema Protocol

External schemas are fetched via HTTP. The expected response shape is:
```json
{ "data": { "prisma": "<prisma schema string>" } }
```

API keys can be passed as:
- A literal string: `"apiKey": "my-secret"`
- An env var reference: `"apiKey": "$MY_API_KEY"` (resolved at runtime from `.env` or process environment)

The auth header sent is `api-key: <resolved value>`.

When an external schema references types not present in the main schema, `getDMMFSafe()` strips those fields and retries DMMF parsing rather than crashing.

---

## What NOT to Do

- **Do not edit `src/utils/propeties.static.ts`** — auto-generated, overwritten on each run.
- **Do not uncomment `enum.ts`** — enum generation is handled inline in `dto-generator.ts` and `response-generator.ts`; the standalone file was superseded.
- **Do not add `.ts` extensions to imports** — the NodeNext module resolver requires `.js` even for TypeScript source files.
- **Do not add a test framework** without discussing it first — the project currently has no automated tests by design.
- **Do not modify `dist/`** — it is compiled output, gitignored, and will be overwritten by `npm run build`.

---

## Key Dependencies

| Package | Role |
|---|---|
| `@prisma/internals` | `getDMMF()` — parses Prisma schema into DMMF |
| `ajv` + `ajv-formats` | Validates `doc-gen.config.json` against JSON Schema |
| `prettier` | Formats every generated file before writing |
| `typescript` | Compiler (dev) |

Peer dependencies expected in the consumer project: `@nestjs/swagger`, `class-transformer`, `class-validator`.

---

## Further Reading

- [docs/architecture.md](docs/architecture.md) — class hierarchy, dependency graph, data flow
- [docs/configuration.md](docs/configuration.md) — complete `doc-gen.config.json` reference
- [docs/generated-output.md](docs/generated-output.md) — anatomy of generated files
- [AGENTS.md](AGENTS.md) — development notes in Portuguese
- [README.md](README.md) — public user documentation
