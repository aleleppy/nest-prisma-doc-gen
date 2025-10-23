import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Scalar, Field, DocGenModel } from "../types.js";

export class Helper {
  static prismaScalarToTs(s: Scalar): string {
    switch (s) {
      case "String":
        return "string";
      case "Int":
        return "number";
      case "BigInt":
        return "bigint";
      case "Float":
      case "Decimal":
        return "number";
      case "Boolean":
        return "boolean";
      case "DateTime":
        return "Date";
      case "Json":
        return "object";
      case "Bytes":
        return "Buffer";
      default: {
        return "any";
      }
    }
  }

  static validatorForScalar(s: Scalar): string {
    switch (s) {
      case "String":
        return "IsString";
      case "Int":
        return "IsInt";
      case "BigInt":
        return "IsNumber"; // class-validator não tem IsBigInt
      case "Float":
      case "Decimal":
        return "IsNumber";
      case "Boolean":
        return "IsBoolean";
      case "DateTime":
        return "IsDate";
      case "Json":
        return ""; // costuma ser livre
      case "Bytes":
        return ""; // Buffer não tem decorador nativo
      default:
        return "";
    }
  }

  static swaggerType(field: Field): string | undefined {
    // mapeia para Swagger 'type' básico quando possível
    if (field.kind === "scalar") {
      const t = field.type;

      switch (t) {
        case "String":
          return "string";
        case "Int":
        case "Float":
        case "Decimal":
          return "number";
        case "BigInt":
          return "integer";
        case "Boolean":
          return "boolean";
        case "DateTime":
          return "string"; // format date-time
        case "Json":
          return "object";
        case "Bytes":
          return "string"; // base64
      }
    }
    return undefined;
  }

  static toKebab(s: string): string {
    return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  importsForModel(model: DocGenModel): {
    enums: boolean;
    hasDate: boolean;
  } {
    const needsEnum = model.fields.some((field) => field.kind === "enum");
    return {
      enums: needsEnum,
      hasDate: model.fields.some((field) => field.kind === "scalar" && field.type === "DateTime"),
    };
  }

  static async readPrismaFolderDatamodel(dir: string): Promise<string> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const mainSchemaPath = path.join(dir, "schema.prisma");
    try {
      const mainStat = await fs.stat(mainSchemaPath);
      if (mainStat.isFile()) files.push(mainSchemaPath);
    } catch {}

    // varrer demais itens (exceto migrations e o schema.prisma já incluído)
    for (const entry of entries) {
      if (entry.name === "migrations") continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const nested = await this.readPrismaFolderDatamodel(full);
        if (nested.trim()) files.push(`\n// ---- ${full} ----\n${nested}`);
      } else if (entry.isFile() && entry.name.endsWith(".prisma") && full !== mainSchemaPath) {
        const content = await fs.readFile(full, "utf-8");
        files.push(`\n// ---- ${full} ----\n${content}`);
      }
    }

    // se não houver nada além de subpastas, retorna o que juntou nelas
    if (!files.length) return "";

    // quando schema.prisma existe, ele já está no topo do array
    if (files[0] === mainSchemaPath) {
      const head = await fs.readFile(mainSchemaPath, "utf-8");
      const tail = files.slice(1).join("\n");
      return `${head}\n${tail}`;
    }

    // caso não exista schema.prisma, apenas concatena
    const contents = await Promise.all(files.map(async (f) => (f.startsWith("\n// ---- ") ? f : fs.readFile(f, "utf-8"))));
    return contents.join("\n");
  }

  findTypeForField(field: Field): string {
    if (field.kind === "scalar") {
      const base = Helper.prismaScalarToTs(field.type);
      return field.isList ? `${base}[]` : base;
    } else if (field.kind === "enum") {
      const base = field.type;
      return field.isList ? `${base}[]` : base;
    } else if (field.kind === "object") {
      const base = "any";
      return field.isList ? `${base}[]` : base;
    } else return "any";
  }

  static splitByUpperCase(str: string): string[] {
    return str.split(/(?=[A-Z])/);
  }

  isDate(field: Field): boolean {
    return field.kind === "scalar" && field.type === "DateTime";
  }
}
