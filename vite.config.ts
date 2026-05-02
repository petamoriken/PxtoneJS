import { readFileSync } from "node:fs";

import { defineConfig } from "vite";

const { version } = JSON.parse(
  readFileSync("deno.json", "utf-8"),
) as { version: string };

const banner = `/**!
 * @license
 * PxtoneJS v${version} | MIT License | 2016-2026 Kenta Moriuchi <moriken@kimamass.com> (https://moriken.dev)
 * Includes lewton (Vorbis decoder written in pure Rust) | MIT or Apache License 2.0 | 2016 est31 <MTest31@outlook.com> and contributors
 */`;

function wasmInstancePlugin() {
  return {
    name: "wasm-instance",
    enforce: "pre" as const,
    load(id: string) {
      if (!id.endsWith(".wasm")) return null;
      const buffer = readFileSync(id);
      const base64 = buffer.toString("base64");
      const wasmModule = new WebAssembly.Module(buffer);
      const namedExports = WebAssembly.Module.exports(wasmModule)
        .map((e) => `export const ${e.name} = instance.exports.${e.name};`)
        .join("\n");
      return `const instance = new WebAssembly.Instance(new WebAssembly.Module(Uint8Array.from(atob("${base64}"), c => c.charCodeAt(0))));
${namedExports}`;
    },
  };
}

function bannerPlugin(banner: string) {
  return {
    name: "banner",
    generateBundle(
      _opts: unknown,
      bundle: Record<string, { type: string; code?: string }>,
    ) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk" && chunk.code !== undefined) {
          chunk.code = banner + "\n" + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    wasmInstancePlugin(),
    bannerPlugin(banner),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
    },
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: [
        {
          format: "es",
          entryFileNames: "Pxtone.mjs",
          intro: 'Symbol.dispose ??= Symbol("@@dispose");',
        },
        {
          format: "iife",
          entryFileNames: "Pxtone.js",
          name: "Pxtone",
          intro: 'Symbol.dispose ??= Symbol("@@dispose");',
        },
      ],
    },
  },
});
