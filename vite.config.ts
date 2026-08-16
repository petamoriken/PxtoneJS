import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "vite";

const { version } = JSON.parse(
  readFileSync("deno.json", "utf-8"),
) as { version: string };

const banner = `/**
 * @license MIT
 * PxtoneJS v${version}
 * Copyright (c) 2016-2026 Kenta Moriuchi <moriken@kimamass.com> (https://moriken.dev)
 *
 * This library includes third-party software under the following licenses:
 * - ogg (3-Clause BSD): Copyright (c) 2016-2017 est31 and contributors, 2002-2015 Xiph.org Foundation
 * - lewton (MIT or Apache-2.0): Copyright (c) 2016 est31 and contributors
 * - tinyvec (Zlib or MIT or Apache-2.0): Copyright (c) 2019 Daniel "Lokathor" Gee
 * - talc (MIT): Copyright (c) 2026 Shaun Beautement
 *
 * Play Pxtone Collage ["pxtone"](https://pxtone.org/) files in the browser.
 * @module Pxtone
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

// rolldown strips the indentation of `output.banner` and of anything renderChunk returns, and
// renderChunk without a sourcemap warns [SOURCEMAP_BROKEN], so prepend the banner to the written
// files and shift the sourcemap by the number of added lines
function bannerPlugin(banner: string) {
  return {
    name: "banner",
    writeBundle(
      options: { dir?: string; format?: string },
      bundle: Record<string, { type: string; fileName: string; sourcemapFileName?: string }>,
    ) {
      const { dir, format } = options;
      if (dir === undefined) return;

      // the ES bundle also points at its type definitions
      const text = format === "es"
        ? `${banner}\n// @ts-self-types="./Pxtone.d.mts"\n`
        : `${banner}\n`;
      const emptyLines = ";".repeat(text.split("\n").length - 1);

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;

        const codePath = join(dir, chunk.fileName);
        writeFileSync(codePath, text + readFileSync(codePath, "utf-8"));

        const { sourcemapFileName } = chunk;
        if (sourcemapFileName === undefined) continue;
        const mapPath = join(dir, sourcemapFileName);
        const map = JSON.parse(readFileSync(mapPath, "utf-8")) as { mappings: string };
        map.mappings = emptyLines + map.mappings;
        writeFileSync(mapPath, JSON.stringify(map));
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
      entry: "src/Pxtone.ts",
    },
    outDir: "bundle",
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      // drop the `//#region` comments
      experimental: {
        attachDebugInfo: "none",
      },
      output: [
        {
          format: "es",
          entryFileNames: "Pxtone.mjs",
          comments: { legal: false, jsdoc: false },
        },
        {
          format: "iife",
          entryFileNames: "Pxtone.js",
          name: "Pxtone",
          intro: '"use strict";',
          comments: { legal: false, jsdoc: false },
        },
      ],
    },
  },
});
