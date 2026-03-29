# Generated Output — nest-prisma_doc-gen

## Output Directory Structure

Given `"outputPath": "src/types/docgen"`, the generator produces:

```
src/types/docgen/
├── index.ts                        # Main barrel — exports everything
├── generic.dto.ts                  # DefaultIdDto
├── fields.ts                       # FIELD_NAMES const + FieldName type
│
└── types/
    ├── user.ts                     # User model (DTO + Response + namespace)
    ├── product.ts                  # Product model
    └── ...                         # One file per Prisma model

# For each external schema (e.g. "name": "transaction"):
└── transaction/
    ├── index.ts                    # Re-exports all transaction types
    ├── enums.ts                    # Enums declared in the transaction schema
    └── types/
        ├── transaction.payment.ts
        └── ...
```

---

## Anatomy of a Generated Model File

Given this Prisma model:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

The generator produces `src/types/docgen/types/user.ts`:

```ts
// AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!
/* eslint-disable @typescript-eslint/no-namespace */
import { ApiProperty, IntersectionType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'src/utils/validators';

// ─── Per-field DTO wrapper classes ─────────────────────────────────────

class EmailDto {
  @ApiProperty({ type: 'string', example: 'user@example.com', required: true })
  @IsString()
  @IsNotEmpty()
  email!: string;
}

class NameDto {
  @ApiProperty({ type: 'string', example: 'ordinary string', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}

class RoleDto {
  @ApiProperty({ enum: Role, example: Object.values(Role)[0], required: true })
  @IsEnum(Role)
  role!: Role;
}

// ─── DTO class (intersection of all field DTOs) ─────────────────────────

class UserDto extends IntersectionType(EmailDto, NameDto, RoleDto) {}

// ─── ID parameter class ─────────────────────────────────────────────────

class UserId {
  @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

// ─── Per-field Response wrapper classes ────────────────────────────────

class IdRes {
  @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
  @Expose()
  id!: string;
}

class EmailRes {
  @ApiProperty({ type: 'string', example: 'user@example.com', required: true })
  @Expose()
  email!: string;
}

class NameRes {
  @ApiProperty({ type: 'string', example: 'ordinary string', required: false })
  @Expose()
  name?: string;
}

class RoleRes {
  @ApiProperty({ enum: Role, example: Object.values(Role)[0], required: true })
  @Expose()
  role!: Role;
}

class CreatedAtRes {
  @ApiProperty({ type: 'string', example: '2025-09-03T03:00:00.000Z', required: true })
  @Expose()
  createdAt!: Date;
}

class UpdatedAtRes {
  @ApiProperty({ type: 'string', example: '2025-09-03T03:00:00.000Z', required: true })
  @Expose()
  updatedAt!: Date;
}

// ─── Response class (intersection of all field Res classes) ────────────

class UserRes extends IntersectionType(IdRes, EmailRes, NameRes, RoleRes, CreatedAtRes, UpdatedAtRes) {}

// ─── Namespace export ──────────────────────────────────────────────────

export namespace User {
  export const Dto = UserDto;
  export type Dto = UserDto;
  export const Res = UserRes;
  export type Res = UserRes;
  export const Id = UserId;
  export type Id = UserId;

  export namespace Input {
    export namespace Email {
      export type Dto = EmailDto;
      export const Dto = EmailDto;
      export type Res = EmailRes;
      export const Res = EmailRes;
    }
    export namespace Name {
      export type Dto = NameDto;
      export const Dto = NameDto;
      export type Res = NameRes;
      export const Res = NameRes;
    }
    // ... one namespace per field
  }
}
```

---

## Field Inclusion Rules

### DTO (`UserDto`)

| Condition | Included? |
|---|---|
| `field.isId === true` | No |
| `field.isUpdatedAt === true` | No |
| `field.name === "createdAt"` | No |
| `field.kind === "object"` (relation) | No |
| Everything else | Yes |

### Response (`UserRes`)

| Condition | Included? |
|---|---|
| `field.kind === "object"` (relation) | No |
| Everything else | Yes (including `id`, `createdAt`, `updatedAt`) |

---

## Validator Assignment per Field

Validators are applied automatically based on the field's Prisma type, then custom validators from `doc-gen.config.json` are appended.

| Prisma type | Auto validators |
|---|---|
| `String`, `Json` | `@IsString()` [+ `@IsNotEmpty()` if required] |
| `DateTime` | `@IsDateString()` |
| `Boolean` | `@IsBoolean()` |
| `Int`, `BigInt`, `Float`, `Decimal` | `@IsNumber()` |
| `isList: true` | `@IsArray()` + `each: true` on the type validator |
| `isRequired: false` | `@IsOptional()` |
| `kind === "enum"` | `@IsEnum(EnumType)` |

---

## `@ApiProperty` Generation

### `type` vs `enum` key

- Enum fields use `enum: EnumType` instead of `type: '...'`
- Relation fields use `type: () => TypeRes` (lazy reference for Swagger)
- Array relations use `type: [TypeRes]`
- DateTime uses `type: 'string'` (ISO 8601 string in OpenAPI)

### `isArray`

When `isList: true`, `isArray: true` is added to `@ApiProperty`.

### `required`

- `isRequired: true` → `required: true`
- `isRequired: false` → `required: false`
- JSON (`object`) fields use `additionalProperties: true` instead

### Optional flag on the TypeScript property

- `isRequired: true` → `field!: Type` (non-null assertion)
- `isRequired: false` → `field?: Type`

---

## `generic.dto.ts`

Always generated regardless of the schema:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'src/utils/validators';

export class DefaultIdDto {
  @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
```

---

## `fields.ts`

Contains a typed const of all field names found across all models:

```ts
// AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!
export const FIELD_NAMES = ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt', ...] as const;
export type FieldName = typeof FIELD_NAMES[number];
```

Use `FieldName` for type-safe field references in your application.

---

## `index.ts` (main barrel)

```ts
export * from './types/user';
export * from './types/product';
// ... one export per local model

// External service namespaces (if configured):
export * as DG_TRANSACTION from './transaction/index';

// Self-reference for DG shorthand:
export * as DG from '../docgen';
```

---

## Enum Handling

### Enums from the main schema

Imported from `@prisma/client`:
```ts
import { Role, Status } from '@prisma/client';
```

### Enums from external schemas

Generated in `{service}/enums.ts`:
```ts
// AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}
```

Imported in the external service's model files:
```ts
import { PaymentStatus } from '../enums';
```

---

## Namespace Usage in Consumer Code

```ts
import { User, DG_TRANSACTION } from 'src/types/docgen';

// Type usage
function createUser(dto: User.Dto): User.Res { ... }
function getUserById(id: User.Id): User.Res { ... }

// Field-level composition (for partial updates, etc.)
function patchEmail(dto: User.Input.Email.Dto) { ... }

// External service types
function getPayment(id: string): DG_TRANSACTION.Payment.Res { ... }
```

---

## What Is NOT Generated

- No database access code
- No NestJS controllers or services
- No migrations or Prisma client mutations
- No test files
- The `id`, `createdAt`, `updatedAt` fields are excluded from DTOs (present only in Responses)
- Relations (`kind === "object"`) are excluded from both DTOs and Responses
