# Architecture — nest-prisma_doc-gen

## Class Hierarchy

```
DocGen                          (src/main.ts)
├── DocGenConfig                (src/utils/loader.ts)  ← singleton loaded at import time
├── PrismaUtils                 (src/utils/prisma-utils.ts)
├── DocGenGeneric               (src/entities/generic.ts)
├── DocFields                   (src/field.type.ts)
└── DocGenModel[]               (src/entities/model.ts)
    ├── DocGenDto               (src/entities/dto-generator.ts)
    │   └── DocGenField[]       (src/entities/field.ts)
    │       └── Validator[]     (src/entities/validator.ts)
    ├── DocGenResponse          (src/entities/response-generator.ts)
    │   └── DocGenField[]
    │       └── Validator[]
    └── DocGenFile              (src/file.ts)

Helper                          (src/utils/helpers.ts)  ← static utilities, used everywhere
DocGenRules                     (src/rules.ts)          ← exported as library entry point
```

---

## File Responsibility Table

| File | Class | Responsibility |
|---|---|---|
| `src/main.ts` | `DocGen` | CLI entry point; orchestrates the full generation pipeline |
| `src/index.ts` | — | Library export — re-exports `DocGenRules` only |
| `src/rules.ts` | `DocGenRules` | Converts raw config arrays into Maps/Sets; the library's public API |
| `src/types.ts` | — | Shared type definitions (`Field`, `Model`, `Scalar`, `FieldKind`, …) |
| `src/config.type.ts` | `ValidatorBuilder`, `ApiExampleBuilder`, `ExternalPrismaSchema`, `Inside` | Config shape types |
| `src/field.type.ts` | `DocFields` | Builds the `fields.ts` file (field name constants) |
| `src/static.ts` | `Static` | Single constant: auto-generated file header comment |
| `src/file.ts` | `DocGenFile` | Writes a file to disk; applies Prettier formatting |
| `src/entities/model.ts` | `DocGenModel` | Coordinates DTO + Response generation; assembles namespace export |
| `src/entities/dto-generator.ts` | `DocGenDto` | Generates the `{Model}Dto` class and per-field `{Field}Dto` wrapper classes |
| `src/entities/response-generator.ts` | `DocGenResponse` | Generates the `{Model}Res` class and per-field `{Field}Res` wrapper classes |
| `src/entities/field.ts` | `DocGenField` | Generates a single field's decorators and type declaration |
| `src/entities/validator.ts` | `Validator` | Builds `@DecoratorName(param?)` strings |
| `src/entities/generic.ts` | `DocGenGeneric` | Generates `generic.dto.ts` with `DefaultIdDto` |
| `src/entities/enum.ts` | — | Mostly commented out; not used in current pipeline |
| `src/utils/loader.ts` | `DocGenConfig` | Loads `doc-gen.config.json`, validates with AJV, exposes `config` singleton |
| `src/utils/helpers.ts` | `Helper` | Type mappings, string utilities (`toKebab`, `capitalizeFirstSafe`, …) |
| `src/utils/prisma-utils.ts` | `PrismaUtils` | Reads `.prisma` files recursively; fetches external schemas via HTTP |
| `src/utils/propeties.static.ts` | — | Auto-generated list of field names — do not edit |

---

## Dependency Graph

```
main.ts
  ├── utils/loader.ts       (config singleton — imported at module load)
  ├── utils/prisma-utils.ts
  ├── utils/helpers.ts
  ├── entities/model.ts
  │     ├── entities/dto-generator.ts
  │     │     ├── entities/field.ts
  │     │     │     ├── entities/validator.ts
  │     │     │     ├── utils/helpers.ts
  │     │     │     └── utils/loader.ts  (config)
  │     │     ├── utils/helpers.ts
  │     │     ├── utils/loader.ts  (config)
  │     │     └── static.ts
  │     ├── entities/response-generator.ts
  │     │     ├── entities/field.ts
  │     │     └── utils/helpers.ts
  │     ├── file.ts
  │     └── utils/helpers.ts
  ├── entities/generic.ts
  │     ├── file.ts
  │     └── utils/loader.ts  (config)
  ├── field.type.ts
  │     └── file.ts
  └── file.ts

index.ts
  └── rules.ts
        └── config.type.ts

utils/loader.ts
  └── rules.ts
        └── config.type.ts
```

> `utils/loader.ts` is a top-level await module — `config` is resolved at import time before any other code runs.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  doc-gen.config.json  +  .env                                   │
│         │                                                        │
│         ▼                                                        │
│  DocGenConfig.load()  ──AJV──►  DocGenConfig (singleton)        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PrismaUtils.readPrismaFolderDatamodel(prismaPath)              │
│         │                                                        │
│         ▼                                                        │
│  concatenated .prisma string                                    │
│         │                                                        │
│         ▼                                                        │
│  getDMMF()  ──────────────────►  DMMF datamodel                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ├── [optional] PrismaUtils.fetchExternalSchemas()
         │         │
         │         ▼  (HTTP fetch per external service)
         │   getDMMFSafe(combined)  →  filter external models/enums
         │         │
         │         ▼
         │   DocGenModel(model, servicePrefix, mainEnumNames)
         │   DocGenFile → save  (external/{service}/types/{model}.ts)
         │   DocGenFile → save  (external/{service}/index.ts)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  For each model in datamodel.models:                            │
│                                                                  │
│   DocGenModel(model)                                            │
│     │                                                            │
│     ├── DocGenResponse.build()                                  │
│     │     └── DocGenField("res") × N fields                     │
│     │           └── buildInfos() → @ApiProperty + @Expose()     │
│     │                                                            │
│     ├── DocGenDto.build()                                       │
│     │     └── DocGenField("dto") × N filtered fields            │
│     │           └── buildInfos() → @ApiProperty + validators    │
│     │                                                            │
│     └── namespace export string assembled                        │
│                                                                  │
│   DocGenFile.save()  →  Prettier  →  src/types/docgen/types/    │
└─────────────────────────────────────────────────────────────────┘
         │
         ├── DocGenGeneric.build() → generic.dto.ts
         ├── DocFields.file.save() → fields.ts
         └── DocGen.build() writes index.ts
```

---

## Key Design Decisions

### IntersectionType composition
Each field is extracted into its own small class (`EmailDto`, `EmailRes`), then the model-level class extends `IntersectionType(EmailDto, NameDto, …)`. This allows NestJS to properly inherit all `@ApiProperty` metadata through the mixin chain, which Swagger requires for correct schema generation.

### `config` singleton via top-level await
`utils/loader.ts` exports `config` as a top-level awaited value. This means all files that import `config` get a fully resolved `DocGenConfig` instance — no async plumbing needed in the generators themselves.

### External schema isolation
External schemas are cleaned of `datasource`/`generator` blocks and any types already present in the main schema before being merged. The combined schema is parsed with `getDMMFSafe()`, which strips unknown type references and retries on parse failure, making external schema handling resilient.

### Enum split: local vs. `@prisma/client`
When a model references enums, the generator checks whether each enum belongs to the main schema (available from `@prisma/client`) or to an external service (available from the local `enums.ts`). Imports are emitted accordingly in two separate `import` statements.
