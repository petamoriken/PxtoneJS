import { readFileSync } from "node:fs";

import { defineConfig } from "vite";

const { version } = JSON.parse(
  readFileSync("deno.json", "utf-8"),
) as { version: string };

const banner = `/**
 * @license MIT
 * PxtoneJS v${version} | MIT License | 2016-2026 Kenta Moriuchi <moriken@kimamass.com> (https://moriken.dev)
 * Includes lewton (Vorbis decoder written in pure Rust) | MIT or Apache License 2.0 | 2016 est31 <MTest31@outlook.com> and contributors
 *
 * Play Pxtone Collage ["pxtone"](https://pxtone.org/) files in the browser.
 *
 * @example
 * \`\`\`ts
 * const ctx = new AudioContext();
 * using pxtone = new Pxtone({ sampleRate: ctx.sampleRate });
 * pxtone.read(fileBytes);
 * const stream = pxtone.stream();
 * \`\`\`
 *
 * @module
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
        .map((e) => `export const ${e.name} = exports.${e.name};`)
        .join("\n");
      return `const base64wasm = "${base64}";
let bytes; if (Uint8Array.fromBase64) {
  bytes = Uint8Array.fromBase64(base64wasm);
} else {
  const bin = atob(base64wasm);
  bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    bytes[i] = bin.charCodeAt(i);
  }
}
const module = new WebAssembly.Module(bytes);
const exports = new WebAssembly.Instance(module).exports;
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

function stripCommentsPlugin() {
  return {
    name: "strip-comments",
    renderChunk(code: string) {
      return code
        .replace(/\/\*\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/#(end)?region.*\n?/gm, "")
        .replace(/\n{3,}/g, "\n\n");
    },
  };
}

export default defineConfig({
  plugins: [
    wasmInstancePlugin(),
    stripCommentsPlugin(),
    bannerPlugin(banner),
  ],
  build: {
    lib: {
      entry: "src/Pxtone.ts",
    },
    outDir: "bundle",
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
