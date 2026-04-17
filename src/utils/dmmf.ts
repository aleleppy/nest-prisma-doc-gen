import prismaPkg from "@prisma/internals";
import { Helper } from "./helpers.js";

/**
 * Thin wrapper around `@prisma/internals.getDMMF`.
 *
 * ⚠️  `@prisma/internals` is an UNDOCUMENTED INTERNAL API of Prisma.
 * It may change between minor versions without notice. Keep this module
 * as the single consumer so future swaps (to `@mrleebo/prisma-ast` or a
 * stable alternative) touch only this file.
 */

const { getDMMF } = prismaPkg;

export type DMMFResult = Awaited<ReturnType<typeof getDMMF>>;
export type DMMFDatamodel = DMMFResult["datamodel"];

export async function getDMMFFromSchema(datamodel: string): Promise<DMMFResult> {
  return getDMMF({ datamodel });
}

/**
 * Retries DMMF parsing after stripping fields that reference unresolved types.
 *
 * Default: throws a detailed error listing missing types + schema context.
 * With `allowMissingTypes: true`: strips the fields (lossy) and warns.
 */
export async function getDMMFSafe(
  datamodel: string,
  context: string,
  options: { allowMissingTypes: boolean },
): Promise<DMMFResult> {
  try {
    return await getDMMFFromSchema(datamodel);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const missing = [...message.matchAll(/Type "(\w+)" is neither a built-in type/g)].map((m) => m[1]);

    if (missing.length === 0) throw err;

    const uniqueTypes = [...new Set(missing)];

    if (!options.allowMissingTypes) {
      throw new Error(
        `Schema '${context}' referencia tipos não resolvidos: ${uniqueTypes.join(", ")}.\n` +
          `→ Defina esses tipos no schema principal, ou rode com --allow-missing-types ` +
          `para remover os campos afetados (perda de dados no output).`,
      );
    }

    console.warn(
      `⚠️  [${context}] Removendo campos com tipos não resolvidos: ${uniqueTypes.join(", ")} ` +
        `(--allow-missing-types ativo)`,
    );

    const typePattern = uniqueTypes.map(Helper.escapeRegex).join("|");
    const re = new RegExp(`^\\s+\\w+\\s+(?:${typePattern})[\\s\\[\\]\\?].*$`, "gm");
    const cleaned = datamodel.replaceAll(re, "");

    return await getDMMFFromSchema(cleaned);
  }
}
