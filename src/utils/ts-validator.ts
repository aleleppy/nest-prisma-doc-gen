/**
 * Validates generated TypeScript source for SYNTAX errors before it hits disk.
 *
 * Catches the main failure mode of string-templated codegen: missing braces,
 * mismatched quotes, mangled identifiers. Does NOT do full type-checking —
 * that's the consumer's `tsc` pass.
 *
 * TypeScript is imported lazily because it's not a runtime dep of prismadoc;
 * we rely on the consumer's install (nearly every user of this CLI has it).
 * If it can't be resolved, we skip validation with a one-time warning.
 */

type TSModule = typeof import("typescript");

let cachedTs: TSModule | null | undefined;
let warned = false;

async function loadTypescript(): Promise<TSModule | null> {
  if (cachedTs !== undefined) return cachedTs;
  try {
    const mod = await import("typescript");
    cachedTs = (mod.default ?? mod) as TSModule;
  } catch {
    cachedTs = null;
    if (!warned) {
      console.warn(
        "⚠️  TypeScript não encontrado — pulando validação sintática do código gerado. " +
          "Instale `typescript` como dev dep para ativar.",
      );
      warned = true;
    }
  }
  return cachedTs;
}

export async function validateTsSyntax(source: string, filePath: string): Promise<void> {
  const ts = await loadTypescript();
  if (!ts) return;

  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.Latest, noEmit: true, isolatedModules: true },
    reportDiagnostics: true,
    fileName: filePath,
  });

  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length === 0) return;

  const formatted = errors
    .map((d) => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      if (d.file && typeof d.start === "number") {
        const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
        return `  [${line + 1}:${character + 1}] ${msg}`;
      }
      return `  ${msg}`;
    })
    .join("\n");

  throw new Error(`Código gerado com erro de sintaxe em ${filePath}:\n${formatted}`);
}
