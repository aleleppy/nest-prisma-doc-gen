# AGENTS.md — nest-prisma_doc-gen

## Visão Geral

Gerador de código que cria DTOs (com `@ApiProperty` + `class-validator`) e tipos Response para NestJS/Swagger a partir de schemas Prisma. Publicado no npm como `nest-prisma_doc-gen`, CLI exposto como `doc-gen`.

## Stack & Ambiente

- **Linguagem:** TypeScript 5.6+ (strict mode)
- **Runtime:** Node.js com ESM (`"type": "module"` no package.json)
- **Module system:** NodeNext (imports usam extensão `.js` mesmo para `.ts`)
- **Target:** ES2022
- **Dependências-chave:** `@prisma/internals` (DMMF parser), `ajv` (validação de config), `prettier` (formatação do código gerado)
- **Sem framework de teste configurado** — não há testes automatizados no momento

## Estrutura do Projeto

```
src/
├── main.ts                    # Entry point CLI (bin: doc-gen)
├── index.ts                   # Export da lib (apenas DocGenRules)
├── types.ts                   # Tipos core (Field, Model, Scalar, etc.)
├── config.type.ts             # Builders de configuração
├── field.type.ts              # DocFields — gera constante com nomes de campos
├── static.ts                  # Constantes (comentário auto-gerado)
├── rules.ts                   # Processador de regras de configuração
├── file.ts                    # I/O de arquivos + formatação Prettier
├── entities/
│   ├── model.ts               # DocGenModel — orquestra DTO + Response por model
│   ├── dto-generator.ts       # DocGenDto — gera classes DTO com validators
│   ├── response-generator.ts  # DocGenResponse — gera classes Response (sem validators)
│   ├── field.ts               # DocGenField — geração por campo individual
│   ├── validator.ts           # Validator — builder de decorators
│   ├── generic.ts             # DocGenGeneric — cria DTOs genéricos (DefaultIdDto)
│   └── enum.ts                # Placeholder para enums (parcialmente implementado)
└── utils/
    ├── loader.ts              # Carrega e valida doc-gen.config.json via AJV
    ├── helpers.ts             # Utilitários (mapeamento de tipos, kebab-case, etc.)
    ├── prisma-utils.ts        # Leitura recursiva de arquivos .prisma
    └── propeties.static.ts    # Constantes de nomes de campo (auto-gerado)
schemas/
└── config.schema.json         # JSON Schema para validação da config
scripts/
└── copy-schemas.js            # Copia schema JSON para dist no build
```

## Fluxo de Execução

```
npx doc-gen
  → main.ts: DocGen.init()
  → loader.ts: carrega e valida doc-gen.config.json
  → prisma-utils.ts: lê todos os .prisma recursivamente
  → @prisma/internals getDMMF(): parse do schema para DMMF
  → Para cada model:
      → DocGenModel → DocGenDto (campos filtrados, com validators)
                    → DocGenResponse (todos os campos, sem validators)
      → Gera arquivo em src/types/docgen/types/{model-kebab}.ts
  → Gera index.ts e fields.ts
  → Formata tudo com Prettier
  → "✅ DTOs gerados com sucesso!"
```

## Convenções de Código

### Imports
- **Sempre usar extensão `.js`** nos imports relativos (exigido pelo NodeNext): `import { X } from './foo.js'`
- Imports de `node:` para módulos nativos: `import * as path from 'node:path'`

### Naming
- Classes: `PascalCase` (`DocGenModel`, `DocGenField`)
- Prefixo `DocGen` para classes do core do gerador
- Métodos estáticos para utilitários puros (`Helper.toKebab()`, `Helper.prismaScalarToTs()`)
- Arquivos: `kebab-case.ts`
- Classes geradas: `{FieldName}Dto`, `{FieldName}Res`, `{Model}Dto`, `{Model}Res`, `{Model}Id`

### Padrões
- Classes com métodos `build()` que retornam strings de código gerado
- `DocGenFile` encapsula criação de arquivo + formatação Prettier
- Configuração carregada uma vez como singleton (`config` exportado de `loader.ts`)
- Campos `id`, `createdAt`, `updatedAt` são ignorados nos DTOs por padrão
- Relações (kind `object`) são excluídas dos DTOs
- Código gerado usa `IntersectionType` do NestJS para composição de DTOs

### Idioma
- Comentários no código fonte: português (pt-BR)
- Mensagens de CLI: português
- Comentário auto-gerado: `"// AUTO-GERADO: NÃO EDITAR MANUALMENTE. SUJEITO A PAULADAS!"`
- README e docs públicos: inglês

## Build & Scripts

```bash
npm run build     # tsc && copia schemas para dist
```

- Não há script de test, lint ou format configurado
- Output vai para `dist/` (declarado no tsconfig como `outDir`)
- `dist/main.js` é o CLI entry point (`bin.doc-gen`)
- `dist/index.js` é o entry point da lib

## Configuração do Usuário

O consumidor configura via `doc-gen.config.json` na raiz do projeto:

```json
{
  "prismaPath": "prisma",
  "validatorPath": "src/_nest/validators",
  "ignore": ["createdAt", "updatedAt"],
  "examples": [{ "field": "email", "value": "user@example.com" }],
  "validators": [{ "fields": ["email"], "validator": "IsEmail" }]
}
```

Validado contra `schemas/config.schema.json` via AJV. Todos os campos são obrigatórios.

## Mapeamentos Importantes

| Prisma Type | TypeScript | Swagger | Validator |
|-------------|-----------|---------|-----------|
| String | string | string | IsString |
| Int | number | number | IsInt |
| Float/Decimal | number | number | IsNumber |
| BigInt | bigint | integer | IsNumber |
| Boolean | boolean | boolean | IsBoolean |
| DateTime | Date | string | IsDate |
| Json | object | object | — |
| Bytes | Buffer | string | — |
| Enum | EnumType | enum | IsEnum |

## Código Comentado / Trabalho Futuro

Há blocos de código comentado em `main.ts` e `entities/enum.ts` indicando funcionalidades planejadas:
- Geração global de DTOs por campo (field-level exports consolidados)
- Suporte completo a enums como arquivos separados
- Imports consolidados de validators por model

Não remover esses blocos comentados sem instrução explícita.

## Cuidados ao Modificar

1. **Extensões `.js` nos imports** — O módulo NodeNext exige isso. Nunca usar import sem extensão.
2. **Código gerado pelo próprio projeto** — `src/utils/propeties.static.ts` é auto-gerado. Não editar manualmente.
3. **Singleton de config** — `config` é importado direto de `loader.ts` e executado no import. Cuidado com side effects em testes.
4. **Prettier no runtime** — O gerador usa Prettier programaticamente para formatar output. Respeita o `.prettierrc` do projeto consumidor.
5. **DMMF** — O tipo `Model` em `types.ts` é baseado no DMMF do Prisma. Mudanças na versão do `@prisma/internals` podem quebrar tipos.
