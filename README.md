# Nest Prisma DocGen

[![npm version](https://img.shields.io/badge/npm-v1.0.24-blue.svg)](https://www.npmjs.com/package/nest-prisma_doc-gen)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-9+-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7+-2D3748.svg)](https://www.prisma.io/)

A TypeScript code generator that automatically creates NestJS Swagger DTOs and Response types from your Prisma schema. Eliminates the boilerplate of writing `@ApiProperty()` decorators by parsing your `schema.prisma` file.

## 🚨 Looking for a Better Name?

This package is currently named `nest-prisma_doc-gen`, but we're considering alternatives:

| Option | Rationale |
|--------|-----------|
| **`prisma-nest-swagger`** | Clear stack order: Prisma → Nest → Swagger |
| **`prisma-swagger-dto`** | Emphasizes DTO generation for Swagger |
| **`@pinaculo/prisma-doc`** | Scoped package, cleaner and professional |
| **`prisma-api-gen`** | Short, generic but descriptive |
| **`nest-prisma-codegen`** | Emphasizes code generation aspect |

**Vote for your favorite by opening an issue!** 🗳️

---

## 🚀 Features

- **🔮 Auto-Generated DTOs** - Creates TypeScript DTOs with `@ApiProperty()` decorators from Prisma models
- **📦 Response Types** - Generates response classes for API documentation
- **🎯 Type-Safe** - Full TypeScript support with proper type inference
- **⚡ Intersection Types** - Uses NestJS `IntersectionType` for composing DTOs
- **🧹 Ignores Boilerplate** - Automatically skips `id`, `createdAt`, `updatedAt` fields
- **✅ Class Validator Support** - Integrates with `class-validator` decorators
- **📊 Enum Support** - Handles Prisma enums automatically
- **🔧 Configurable** - Customizable via `doc-gen.config.json`

## 📦 Installation

```bash
npm install nest-prisma_doc-gen
# or
yarn add nest-prisma_doc-gen
# or
pnpm add nest-prisma_doc-gen
```

## 🏁 Quick Start

### 1. Create Configuration File

Create `doc-gen.config.json` in your project root:

```json
{
  "prismaPath": "prisma",
  "validatorPath": "src/_nest/validators",
  "ignore": ["createdAt", "updatedAt", "password"],
  "examples": [],
  "validators": []
}
```

### 2. Run the Generator

```bash
# Using npx
npx doc-gen

# Or add to package.json scripts
{
  "scripts": {
    "generate:docs": "doc-gen"
  }
}
```

### 3. Use Generated Types

The generator creates files in `src/types/docgen/`:

```typescript
import { User } from "src/types/docgen";

// Use the DTO
@Controller("users")
export class UserController {
  @Post()
  @ApiBody({ type: User.Dto })
  async create(@Body() dto: User.Dto): Promise<User.Res> {
    // Your implementation
  }

  @Get(":userId")
  async findOne(@Param() { userId }: User.Id): Promise<User.Res> {
    // Your implementation
  }
}
```

## 📁 Generated Structure

```
src/types/docgen/
├── index.ts                    # Main exports
├── docgen-fields.ts           # Field constants
├── entities/
│   └── [model].response.ts    # Response types
└── types/
    └── [model].ts             # DTOs and namespaces
```

### Example Generated File

For a Prisma model like:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

The generator produces:

```typescript
// AUTO GENERADO. QUEM ALTERAR GOSTA DE RAPAZES!
/* eslint-disable @typescript-eslint/no-namespace */
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'src/_nest/validators';
import { Role } from '@prisma/client';

class EmailDto {
  @ApiProperty({ type: 'string', example: 'user@example.com', required: true })
  @IsString()
  @IsNotEmpty()
  email!: string;
}

class NameDto {
  @ApiProperty({ type: 'string', example: 'John Doe', required: true })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

class RoleDto {
  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER, required: true })
  @IsEnum(Role)
  role!: Role;
}

class UserDto extends IntersectionType(EmailDto, NameDto, RoleDto) {}

class UserId {
  @ApiProperty({ type: 'string', example: 'cmfxu4njg000008l52v7t8qze', required: true })
  @IsString()
  @IsNotEmpty()
  userid!: string;
}

// Response types...

export namespace User {
  export const Dto = UserDto;
  export type Dto = UserDto;
  export const Res = UserRes;
  export type Res = UserRes;
  export const Id = UserId;
  export type Id = UserId;
  
  export namespace Input {
    export namespace Email {
      export type Dto = EmailDto
      export const Dto = EmailDto
    }
    export namespace Name {
      export type Dto = NameDto
      export const Dto = NameDto
    }
    export namespace Role {
      export type Dto = RoleDto
      export const Dto = RoleDto
    }
  }
}
```

## ⚙️ Configuration

### `doc-gen.config.json`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `prismaPath` | `string` | `"prisma"` | Path to prisma schema folder |
| `validatorPath` | `string` | `"src/_nest/validators"` | Import path for validators |
| `ignore` | `string[]` | `[]` | Field names to ignore (e.g., `["password"]`)
| `examples` | `array` | `[]` | Custom example generators |
| `validators` | `array` | `[]` | Field-specific validators |

### Advanced Configuration

```json
{
  "prismaPath": "prisma",
  "validatorPath": "src/common/validators",
  "ignore": ["createdAt", "updatedAt", "deletedAt", "passwordHash"],
  "examples": [
    {
      "field": "email",
      "value": "user@example.com"
    },
    {
      "field": "phone",
      "value": "+1 555-1234"
    }
  ],
  "validators": [
    {
      "fields": ["email"],
      "validator": "IsEmail"
    },
    {
      "fields": ["phone"],
      "validator": "IsPhoneNumber"
    }
  ]
}
```

## 🧩 Generated API

Each model generates a namespace with:

### Types/Classes

| Export | Type | Description |
|--------|------|-------------|
| `User.Dto` | `class` | Input DTO for create/update operations |
| `User.Res` | `class` | Response type with all fields |
| `User.Id` | `class` | ID parameter type for routes |

### Input Namespace

Access individual field DTOs:

```typescript
import { User } from "src/types/docgen";

// Individual field DTOs
type EmailDto = User.Input.Email.Dto;
type NameDto = User.Input.Name.Dto;

// Use in custom compositions
class CustomDto extends IntersectionType(
  User.Input.Email.Dto,
  User.Input.Name.Dto
) {}
```

## 🔧 TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 📚 Usage Examples

### Basic Controller

```typescript
import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiBody, ApiResponse } from "@nestjs/swagger";
import { User } from "src/types/docgen";

@Controller("users")
export class UserController {
  @Post()
  @ApiBody({ type: User.Dto })
  @ApiResponse({ status: 201, type: User.Res })
  async create(@Body() dto: User.Dto): Promise<User.Res> {
    return this.userService.create(dto);
  }

  @Get(":userId")
  @ApiResponse({ status: 200, type: User.Res })
  async findOne(@Param() params: User.Id): Promise<User.Res> {
    return this.userService.findOne(params.userid);
  }

  @Get()
  @ApiResponse({ status: 200, type: [User.Res] })
  async findAll(): Promise<User.Res[]> {
    return this.userService.findAll();
  }
}
```

### Custom Validation

```typescript
// src/_nest/validators/index.ts
export { IsString, IsNotEmpty, IsEnum, IsEmail, IsOptional } from "class-validator";

// Custom validators
export function IsPhoneNumber() {
  // Your custom validator
}
```

### Integration with Prisma Client

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { User } from "src/types/docgen";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: User.Dto): Promise<User.Res> {
    return this.prisma.user.create({ data: dto });
  }

  async findOne(id: string): Promise<User.Res> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

## 🔄 Workflow Integration

### Development

Add to your development workflow:

```json
{
  "scripts": {
    "db:generate": "prisma generate && doc-gen",
    "build": "doc-gen && nest build",
    "dev": "doc-gen && nest start --watch"
  }
}
```

### Pre-commit Hook

Using Husky:

```bash
# .husky/pre-commit
npm run doc-gen
git add src/types/docgen
```

## 🛠️ Troubleshooting

### "Cannot find module" Errors

Ensure the generator has run:

```bash
npx doc-gen
```

### Prisma Schema Not Found

Check your `doc-gen.config.json`:

```json
{
  "prismaPath": "prisma"  // Adjust if your schema is elsewhere
}
```

### Validators Not Importing

Verify the `validatorPath` in config matches your project structure:

```json
{
  "validatorPath": "src/common/validators"  // Adjust as needed
}
```

## 📄 License

ISC License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- [npm](https://www.npmjs.com/package/nest-prisma_doc-gen)
- [GitHub](https://github.com/aleleppy/nest-prisma-doc-gen)
- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [Swagger/OpenAPI](https://swagger.io/)

---

Built with 🦍 by the Pináculo Digital team.
