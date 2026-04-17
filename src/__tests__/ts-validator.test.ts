import { describe, it, expect } from "vitest";
import { validateTsSyntax } from "../utils/ts-validator.js";

describe("validateTsSyntax", () => {
  it("passes on valid TypeScript", async () => {
    const source = `
      export class Foo {
        bar: string = 'hello';
        baz(x: number): number { return x + 1; }
      }
    `;
    await expect(validateTsSyntax(source, "foo.ts")).resolves.toBeUndefined();
  });

  it("passes on valid decorators and generics", async () => {
    const source = `
      export class UserDto {
        name!: string;
        tags: string[] = [];
      }
      export namespace User {
        export type Dto = UserDto;
      }
    `;
    await expect(validateTsSyntax(source, "user.ts")).resolves.toBeUndefined();
  });

  it("throws on mismatched braces", async () => {
    const source = `export class Foo { bar: string; `;
    await expect(validateTsSyntax(source, "bad.ts")).rejects.toThrow(/bad\.ts/);
  });

  it("throws on invalid token sequence", async () => {
    const source = `export const x = = 1;`;
    await expect(validateTsSyntax(source, "bad.ts")).rejects.toThrow(/erro de sintaxe/i);
  });

  it("includes the file name in the error", async () => {
    const source = `export class Foo { bar: string = ; }`;
    await expect(validateTsSyntax(source, "my-file.ts")).rejects.toThrow(/my-file\.ts/);
  });
});
