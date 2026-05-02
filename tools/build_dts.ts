import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const compilerOptions: ts.CompilerOptions = {
  declaration: true,
  emitDeclarationOnly: true,
  allowImportingTsExtensions: true,
  allowArbitraryExtensions: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  strict: true,
  lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
};

let dtsContent = "";

const host = ts.createCompilerHost(compilerOptions);
host.writeFile = (fileName: string, data: string) => {
  if (fileName.endsWith("Pxtone.d.ts")) {
    dtsContent = data;
  }
};

const program = ts.createProgram(
  [join(projectRoot, "src/Pxtone.ts")],
  compilerOptions,
  host,
);

const emitResult = program.emit();

const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

let hasError = false;
for (const diag of diagnostics) {
  if (diag.category === ts.DiagnosticCategory.Error) {
    const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
    const location = diag.file
      ? `${diag.file.fileName}:${diag.file.getLineAndCharacterOfPosition(diag.start!).line + 1}`
      : "unknown";
    console.error(`error: ${location}: ${message}`);
    hasError = true;
  }
}

if (hasError) Deno.exit(1);

if (!dtsContent) {
  console.error("error: no .d.ts output was generated");
  Deno.exit(1);
}

const outPath = join(projectRoot, "dist", "Pxtone.d.mts");
await Deno.writeTextFile(outPath, dtsContent);
console.log(`Generated ${outPath}`);
