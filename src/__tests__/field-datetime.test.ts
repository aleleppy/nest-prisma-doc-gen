import { describe, it, expect, vi } from "vitest";

// O loader faz top-level await em doc-gen.config.json e chama process.exit em
// caso de config inválida; a config do repo aqui é mínima e dispara isso. Como
// DocGenField só lê config.validators e config.examples, mockar com Maps vazios
// é suficiente.
vi.mock("../utils/loader.js", () => ({
  config: { validators: new Map(), examples: new Map() },
}));

const { DocGenField } = await import("../entities/field.js");
type Field = import("../types.js").Field;

function dateTimeField(overrides: Partial<Field> = {}): Field {
  return {
    name: "expirationDate",
    dbName: "expirationDate",
    kind: "scalar",
    isList: false,
    isRequired: false,
    isUnique: false,
    isId: false,
    isReadOnly: false,
    hasDefaultValue: false,
    type: "DateTime",
    isGenerated: false,
    isUpdatedAt: false,
    nativeType: null,
    ...overrides,
  };
}

describe("DocGenField — DateTime decorators (regression: IsISO8601 + Transform autossabotam)", () => {
  it("emits @IsDate() + @Transform for optional DateTime, never @IsISO8601", () => {
    const out = new DocGenField(dateTimeField(), "dto").build();

    expect(out).toContain("@IsDate()");
    expect(out).toContain("@Transform(({ value })");
    expect(out).not.toContain("@IsISO8601");
  });

  it("emits @IsDate({ each: true }) + array-aware @Transform for DateTime[]", () => {
    const out = new DocGenField(dateTimeField({ isList: true }), "dto").build();

    expect(out).toContain("@IsDate({ each: true })");
    expect(out).toContain("Array.isArray(value)");
    expect(out).not.toContain("@IsISO8601");
  });

  it("required DateTime still uses @IsDate (no @IsISO8601) and skips @IsOptional", () => {
    const out = new DocGenField(dateTimeField({ isRequired: true }), "dto").build();

    expect(out).toContain("@IsDate()");
    expect(out).not.toContain("@IsOptional()");
    expect(out).not.toContain("@IsISO8601");
  });

  it("response (fieldType=res) emits only @Expose() — no validators, no Transform", () => {
    const out = new DocGenField(dateTimeField(), "res").build();

    expect(out).toContain("@Expose()");
    expect(out).not.toContain("@IsDate");
    expect(out).not.toContain("@IsISO8601");
    expect(out).not.toContain("@Transform");
  });
});
