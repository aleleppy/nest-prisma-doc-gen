import { describe, it, expect } from "vitest";
import { Helper } from "../utils/helpers.js";

describe("Helper.escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(Helper.escapeRegex("a.b*c?")).toBe("a\\.b\\*c\\?");
    expect(Helper.escapeRegex("[hello]")).toBe("\\[hello\\]");
    expect(Helper.escapeRegex("$foo^bar")).toBe("\\$foo\\^bar");
    expect(Helper.escapeRegex("(x|y)")).toBe("\\(x\\|y\\)");
  });

  it("leaves safe strings untouched", () => {
    expect(Helper.escapeRegex("UserType")).toBe("UserType");
    expect(Helper.escapeRegex("foo_bar123")).toBe("foo_bar123");
  });

  it("makes output safe for RegExp constructor", () => {
    const tricky = "Type.With*Meta";
    const re = new RegExp(Helper.escapeRegex(tricky));
    expect(re.test("Type.With*Meta")).toBe(true);
    expect(re.test("TypeXWithYMeta")).toBe(false);
  });
});

describe("Helper.prismaScalarToTs", () => {
  it("maps Prisma scalars to TS types", () => {
    expect(Helper.prismaScalarToTs("String")).toBe("string");
    expect(Helper.prismaScalarToTs("Int")).toBe("number");
    expect(Helper.prismaScalarToTs("BigInt")).toBe("bigint");
    expect(Helper.prismaScalarToTs("Float")).toBe("number");
    expect(Helper.prismaScalarToTs("Decimal")).toBe("number");
    expect(Helper.prismaScalarToTs("Boolean")).toBe("boolean");
    expect(Helper.prismaScalarToTs("DateTime")).toBe("Date");
    expect(Helper.prismaScalarToTs("Json")).toBe("object");
    expect(Helper.prismaScalarToTs("Bytes")).toBe("Buffer");
  });
});

describe("Helper.toKebab", () => {
  it("converts PascalCase to kebab-case", () => {
    expect(Helper.toKebab("UserProfile")).toBe("user-profile");
    expect(Helper.toKebab("APIKey")).toBe("apikey");
    expect(Helper.toKebab("OrderItem")).toBe("order-item");
  });

  it("leaves lowercase untouched", () => {
    expect(Helper.toKebab("user")).toBe("user");
  });
});

describe("Helper.capitalizeFirstSafe", () => {
  it("capitalizes the first char", () => {
    expect(Helper.capitalizeFirstSafe("email")).toBe("Email");
    expect(Helper.capitalizeFirstSafe("x")).toBe("X");
  });

  it("trims leading whitespace before capitalizing", () => {
    expect(Helper.capitalizeFirstSafe("  email")).toBe("Email");
  });

  it("handles empty string", () => {
    expect(Helper.capitalizeFirstSafe("")).toBe("");
    expect(Helper.capitalizeFirstSafe("   ")).toBe("");
  });
});

describe("Helper.splitByUpperCase", () => {
  it("splits at uppercase boundaries", () => {
    expect(Helper.splitByUpperCase("userId")).toEqual(["user", "Id"]);
    expect(Helper.splitByUpperCase("FooBarBaz")).toEqual(["Foo", "Bar", "Baz"]);
  });
});
