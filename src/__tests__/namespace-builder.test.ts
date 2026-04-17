import { describe, it, expect } from "vitest";
import { InputNamespaceBuilder, buildModelNamespace } from "../entities/namespace-builder.js";
import { validateTsSyntax } from "../utils/ts-validator.js";

type FakeField = { name: string; fieldType: "dto" | "res" };

function field(name: string, fieldType: "dto" | "res"): FakeField {
  return { name, fieldType };
}

describe("InputNamespaceBuilder", () => {
  it("groups dto+res under capitalized field namespace", () => {
    const builder = new InputNamespaceBuilder([field("email", "dto"), field("email", "res")] as never);
    const out = builder.build();
    expect(out).toContain("export namespace Email");
    expect(out).toContain("export type Dto = EmailDto");
    expect(out).toContain("export type Res = EmailRes");
  });

  it("emits one namespace per distinct field", () => {
    const builder = new InputNamespaceBuilder([field("email", "dto"), field("age", "res")] as never);
    const out = builder.build();
    expect(out).toMatch(/export namespace Email\s*{/);
    expect(out).toMatch(/export namespace Age\s*{/);
  });

  it("wraps everything in `namespace Input`", () => {
    const builder = new InputNamespaceBuilder([field("email", "dto")] as never);
    expect(builder.build()).toContain("export namespace Input");
  });

  it("produces syntactically valid TypeScript when combined with model namespace", async () => {
    const inputNs = new InputNamespaceBuilder([field("email", "dto"), field("email", "res")] as never).build();
    const modelNs = buildModelNamespace("User", inputNs);

    // Declare stubs so the generated namespace references resolve
    const preamble = `
      declare const UserDto: any; declare const UserRes: any; declare const UserId: any;
      declare const emailDto: any; declare const emailRes: any;
    `;

    await expect(validateTsSyntax(preamble + modelNs, "model-under-test.ts")).resolves.toBeUndefined();
  });
});

describe("buildModelNamespace", () => {
  it("exposes Dto/Res/Id aliases as both type and value", () => {
    const out = buildModelNamespace("User", "");
    expect(out).toContain("export const Dto = UserDto");
    expect(out).toContain("export type Dto = UserDto");
    expect(out).toContain("export const Res = UserRes");
    expect(out).toContain("export type Res = UserRes");
    expect(out).toContain("export const Id = UserId");
    expect(out).toContain("export type Id = UserId");
  });

  it("embeds the input namespace block verbatim", () => {
    const out = buildModelNamespace("User", "/* INPUT_BLOCK */");
    expect(out).toContain("/* INPUT_BLOCK */");
  });
});
