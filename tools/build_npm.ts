import { emptyDir } from "@deno/dnt";

const { version } = JSON.parse(await Deno.readTextFile("./deno.json")) as {
  version: string;
};

const { success } = await new Deno.Command("deno", {
  args: ["task", "build"],
  stdout: "inherit",
  stderr: "inherit",
}).output();
if (!success) throw new Error("Vite build failed");

await emptyDir("./npm");

await Promise.all([
  Deno.copyFile("./dist/Pxtone.mjs", "./npm/Pxtone.mjs"),
  Deno.copyFile("./dist/Pxtone.mjs.map", "./npm/Pxtone.mjs.map"),
  Deno.copyFile("./dist/Pxtone.js", "./npm/Pxtone.js"),
  Deno.copyFile("./dist/Pxtone.js.map", "./npm/Pxtone.js.map"),
  Deno.copyFile("./dist/Pxtone.d.mts", "./npm/Pxtone.d.mts"),
  Deno.copyFile("./LICENSE.md", "./npm/LICENSE.md"),
  Deno.copyFile("./README.md", "./npm/README.md"),
  Deno.copyFile("./pxtonejs.png", "./npm/pxtonejs.png"),
  Deno.copyFile("./pxtonejs5x.png", "./npm/pxtonejs5x.png"),
]);

await Deno.writeTextFile(
  "./npm/package.json",
  JSON.stringify(
    {
      name: "pxtone",
      version,
      description: "Play Pxtone Collage files in Web Audio API",
      type: "module",
      exports: {
        ".": {
          types: "./Pxtone.d.mts",
          default: "./Pxtone.mjs",
        },
      },
      author: "Kenta Moriuchi <moriken@kimamass.com> (https://moriken.dev)",
      bugs: { url: "https://github.com/petamoriken/PxtoneJS/issues" },
      homepage: "https://github.com/petamoriken/PxtoneJS",
      keywords: [
        "PxtoneCollage",
        "pxtone-collage",
        "WebAudioAPI",
        "web-audio-api",
        "webaudio",
      ],
      license: "MIT",
      repository: {
        type: "git",
        url: "github:petamoriken/PxtoneJS",
      },
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nBuilt npm package v${version} → ./npm/`);
