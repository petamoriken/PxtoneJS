import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// deno.json's lib includes deno.ns for tests, which conflicts with the bundle's
// DOM-only target, so override compilerOptions.lib with a config just for this transpile
const tempDir = await Deno.makeTempDir();
const configPath = join(tempDir, "deno.json");
await Deno.writeTextFile(
  configPath,
  JSON.stringify({ compilerOptions: { lib: ["dom", "dom.iterable", "esnext"] } }),
);

const jsPath = join(tempDir, "Pxtone.js");
const dtsPath = join(tempDir, "Pxtone.d.ts");

const command = new Deno.Command(Deno.execPath(), {
  args: [
    "transpile",
    join(projectRoot, "src/Pxtone.ts"),
    "-o",
    jsPath,
    "--declaration",
    "--config",
    configPath,
    "--quiet",
  ],
  stderr: "inherit",
});

const { success } = await command.output();
if (!success) {
  await Deno.remove(tempDir, { recursive: true });
  Deno.exit(1);
}

const dtsLines = (await Deno.readTextFile(dtsPath)).split("\n");
const dtsContent = dtsLines
  .filter((line) => !line.includes("<amd-module"))
  .join("\n");

await Deno.remove(tempDir, { recursive: true });

const outPath = join(projectRoot, "bundle", "Pxtone.d.mts");
await Deno.writeTextFile(outPath, dtsContent);
console.log(`Generated ${outPath}`);
