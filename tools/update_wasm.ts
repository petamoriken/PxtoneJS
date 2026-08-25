import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "petamoriken/pxtone-rs";
const ASSET_NAME = "pxtone.wasm";

interface ReleaseAsset {
  name: string;
  size: number;
  digest: string | null;
  browser_download_url: string;
}

interface Release {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

const tag = Deno.args[0];
if (tag !== undefined && !/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error("Usage: deno run -A tools/update_wasm.ts [<tag>]");
  Deno.exit(1);
}

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(projectRoot, "src", "pxtone.wasm");
const dtsPath = join(projectRoot, "src", "pxtone.wasm.d.ts");

const headers: Record<string, string> = { accept: "application/vnd.github+json" };
const token = Deno.env.get("GITHUB_TOKEN");
if (token !== undefined) {
  headers.authorization = `Bearer ${token}`;
}

const releaseUrl = tag === undefined
  ? `https://api.github.com/repos/${REPO}/releases/latest`
  : `https://api.github.com/repos/${REPO}/releases/tags/${tag}`;

const releaseResponse = await fetch(releaseUrl, { headers });
if (!releaseResponse.ok) {
  console.error(`Failed to fetch release: ${releaseResponse.status} ${releaseResponse.statusText}`);
  Deno.exit(1);
}
const release = await releaseResponse.json() as Release;

const asset = release.assets.find(({ name }) => name === ASSET_NAME);
if (asset === undefined) {
  console.error(`${release.tag_name} has no "${ASSET_NAME}" asset (${release.html_url})`);
  Deno.exit(1);
}

console.log(`Downloading ${ASSET_NAME} from ${REPO} ${release.tag_name}...`);
const assetResponse = await fetch(asset.browser_download_url, {
  headers: { accept: "application/octet-stream" },
});
if (!assetResponse.ok) {
  console.error(`Failed to download asset: ${assetResponse.status} ${assetResponse.statusText}`);
  Deno.exit(1);
}
const bytes = new Uint8Array(await assetResponse.arrayBuffer());

// verify the asset against the digest GitHub reports (e.g. "sha256:1234abcd...")
if (asset.digest !== null) {
  const [algorithm, expected] = asset.digest.split(":");
  if (algorithm !== "sha256") {
    console.error(`Unsupported digest algorithm: ${algorithm}`);
    Deno.exit(1);
  }
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (actual !== expected) {
    console.error(`Digest mismatch: expected ${expected}, got ${actual}`);
    Deno.exit(1);
  }
}

if (!WebAssembly.validate(bytes)) {
  console.error("Downloaded file is not a valid WebAssembly module");
  Deno.exit(1);
}

const current = await Deno.readFile(wasmPath).catch((error: unknown) => {
  if (error instanceof Deno.errors.NotFound) return null;
  throw error;
});

if (
  current !== null && current.length === bytes.length && current.every((b, i) => b === bytes[i])
) {
  console.log(`Already up to date (${release.tag_name}, ${bytes.length} bytes)`);
  Deno.exit(0);
}

await Deno.writeFile(wasmPath, bytes);
console.log(
  `Updated ${wasmPath} to ${release.tag_name} (${current?.length ?? 0} -> ${bytes.length} bytes)`,
);

// the hand-written declarations must be kept in sync with the module's exports
const exported = new Set(
  WebAssembly.Module.exports(new WebAssembly.Module(bytes)).map(({ name }) => name),
);
const declared = new Set(
  Array.from(
    (await Deno.readTextFile(dtsPath)).matchAll(/^export declare (?:const|function) (\w+)/gm),
    ([, name]) => name,
  ),
);

const added = [...exported].filter((name) => !declared.has(name));
const removed = [...declared].filter((name) => !exported.has(name));
if (added.length > 0 || removed.length > 0) {
  console.log(`\nsrc/pxtone.wasm.d.ts is out of sync with the new module:`);
  for (const name of added) console.log(`  + ${name} (exported by wasm, not declared)`);
  for (const name of removed) console.log(`  - ${name} (declared, no longer exported)`);
  console.log("Update the declarations, then run `deno task test`.");
} else {
  console.log("\nsrc/pxtone.wasm.d.ts covers every export. Run `deno task test` to verify.");
}
