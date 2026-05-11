import {
  alloc,
  dealloc,
  memory,
  service_free,
  service_get_event,
  service_get_event_count,
  service_get_master,
  service_get_text_comment,
  service_get_text_name,
  service_get_unit_count,
  service_get_unit_name,
  service_get_unit_played,
  service_moo,
  service_moo_preparation,
  service_new,
  service_read,
  service_render_noise,
  service_tones_ready,
  validate,
  validate_noise,
} from "../src/pxtone.wasm";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseToml } from "@std/toml";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

interface PtcopSnapshot {
  text: { name: string; comment: string };
  master: {
    ticks_per_beat: number;
    beats_per_measure: number;
    beat_tempo: number;
    measure_count: number;
    repeat_measure: number;
    last_measure: number;
  };
  units: Array<{ name: string; played: boolean }>;
  events: Array<
    { tick: number; unit_index: number; kind: number; value: number }
  >;
}

const WAV_HEADER_LEN = 44;
const WAV_PCM_TOLERANCE = 2;

function wavMatches(
  actual: Uint8Array,
  expected: Uint8Array,
): { ok: boolean; maxDiff: number } {
  if (actual.length !== expected.length) return { ok: false, maxDiff: -1 };
  for (let i = 0; i < WAV_HEADER_LEN; i++) {
    if (actual[i] !== expected[i]) return { ok: false, maxDiff: -1 };
  }
  let maxDiff = 0;
  for (let i = WAV_HEADER_LEN; i + 1 < actual.length; i += 2) {
    let a = actual[i] | (actual[i + 1] << 8);
    let e = expected[i] | (expected[i + 1] << 8);
    if (a >= 0x8000) a -= 0x10000;
    if (e >= 0x8000) e -= 0x10000;
    const diff = Math.abs(a - e);
    if (diff > maxDiff) maxDiff = diff;
  }
  return { ok: maxDiff <= WAV_PCM_TOLERANCE, maxDiff };
}

function pcmToWav(
  samples: Uint8Array,
  channels: number,
  sampleRate: number,
): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buf);
  const enc = new TextEncoder();
  const str = (s: string, off: number) =>
    enc.encode(s).forEach((b, i) => view.setUint8(off + i, b));
  str("RIFF", 0);
  view.setUint32(4, 36 + samples.length, true);
  str("WAVE", 8);
  str("fmt ", 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str("data", 36);
  view.setUint32(40, samples.length, true);
  new Uint8Array(buf, 44).set(samples);
  return new Uint8Array(buf);
}

Deno.test("validate ptcop (wasm)", async () => {
  const sampleDir = join(projectRoot, "tests/sample/ptcop");

  const names: string[] = [];
  for await (const entry of Deno.readDir(sampleDir)) {
    if (entry.isFile && entry.name.endsWith(".ptcop")) names.push(entry.name);
  }
  names.sort();

  if (names.length === 0) {
    throw new Error("no .ptcop files found in tests/sample/ptcop/");
  }

  for (const name of names) {
    const data = await Deno.readFile(join(sampleDir, name));
    const ptr = alloc(data.length);
    new Uint8Array(memory.buffer, ptr, data.length).set(data);
    const result = validate(ptr, data.length);
    dealloc(ptr, data.length);
    if (result !== 0) {
      throw new Error(`${name}: validate returned ${result}, expected 0`);
    }
  }

  // invalid data must fail
  const junk = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const junkPtr = alloc(junk.length);
  new Uint8Array(memory.buffer, junkPtr, junk.length).set(junk);
  const junkResult = validate(junkPtr, junk.length);
  dealloc(junkPtr, junk.length);
  if (junkResult === 0) {
    throw new Error("validate returned 0 for invalid data");
  }
});

Deno.test("validate ptnoise (wasm)", async () => {
  const sampleDir = join(projectRoot, "tests/sample/ptnoise");

  const names: string[] = [];
  for await (const entry of Deno.readDir(sampleDir)) {
    if (entry.isFile && entry.name.endsWith(".ptnoise")) names.push(entry.name);
  }
  names.sort();

  if (names.length === 0) {
    throw new Error("no .ptnoise files found in tests/sample/ptnoise/");
  }

  for (const name of names) {
    const data = await Deno.readFile(join(sampleDir, name));
    const ptr = alloc(data.length);
    new Uint8Array(memory.buffer, ptr, data.length).set(data);
    const result = validate_noise(ptr, data.length);
    dealloc(ptr, data.length);
    if (result !== 0) {
      throw new Error(`${name}: validate_noise returned ${result}, expected 0`);
    }
  }

  // invalid data must fail
  const junk = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const junkPtr = alloc(junk.length);
  new Uint8Array(memory.buffer, junkPtr, junk.length).set(junk);
  const junkResult = validate_noise(junkPtr, junk.length);
  dealloc(junkPtr, junk.length);
  if (junkResult === 0) {
    throw new Error("validate_noise returned 0 for invalid data");
  }
});

Deno.test("decoded ptcop matches reference (wasm)", async () => {
  const sampleDir = join(projectRoot, "tests/sample/ptcop");
  const snapshotDir = join(projectRoot, "tests/snapshots/ptcop");

  const names: string[] = [];
  for await (const entry of Deno.readDir(sampleDir)) {
    if (entry.isFile && entry.name.endsWith(".ptcop")) names.push(entry.name);
  }
  names.sort();

  if (names.length === 0) {
    throw new Error("no .ptcop files found in tests/sample/ptcop/");
  }

  const failures: string[] = [];
  const dec = new TextDecoder();
  const decSjis = new TextDecoder("shift-jis");

  for (const name of names) {
    const stem = name.slice(0, -6);
    const ptcopData = await Deno.readFile(join(sampleDir, name));
    const tomlText = await Deno.readTextFile(join(snapshotDir, `${stem}.toml`));
    const snapshot = parseToml(tomlText) as unknown as PtcopSnapshot;

    const dataPtr = alloc(ptcopData.length);
    new Uint8Array(memory.buffer, dataPtr, ptcopData.length).set(ptcopData);

    const svc = service_new(2, 44100);

    if (service_read(svc, dataPtr, ptcopData.length) !== 0) {
      failures.push(`${name}: service_read failed`);
      dealloc(dataPtr, ptcopData.length);
      service_free(svc);
      continue;
    }
    dealloc(dataPtr, ptcopData.length);

    if (service_tones_ready(svc) !== 0) {
      failures.push(`${name}: service_tones_ready failed`);
      service_free(svc);
      continue;
    }

    // Text
    {
      // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
      const [namePtr, nameLen] = service_get_text_name(svc);
      const textName = namePtr !== 0
        ? decSjis.decode(
          new Uint8Array(memory.buffer, namePtr >>> 0, nameLen >>> 0),
        )
        : "";
      // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
      const [commentPtr, commentLen] = service_get_text_comment(svc);
      const textComment = commentPtr !== 0
        ? decSjis.decode(
          new Uint8Array(memory.buffer, commentPtr >>> 0, commentLen >>> 0),
        )
        : "";
      if (
        textName !== snapshot.text.name ||
        textComment !== snapshot.text.comment
      ) {
        failures.push(`${stem}.toml: text mismatch`);
      }
    }

    // Master
    {
      // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
      const [
        ticksPerBeat,
        beatsPerMeasure,
        beatTempo,
        measureCount,
        repeatMeasure,
        lastMeasure,
      ] = service_get_master(svc);
      const m = snapshot.master;
      if (
        ticksPerBeat !== m.ticks_per_beat ||
        beatsPerMeasure !== m.beats_per_measure ||
        Math.abs(beatTempo - m.beat_tempo) >= 0.001 ||
        measureCount !== m.measure_count ||
        repeatMeasure !== m.repeat_measure ||
        lastMeasure !== m.last_measure
      ) {
        failures.push(`${stem}.toml: master mismatch`);
      }
    }

    // Units
    const unitCount = service_get_unit_count(svc);
    if (unitCount !== snapshot.units.length) {
      failures.push(
        `${stem}.toml: unit count mismatch (got ${unitCount}, expected ${snapshot.units.length})`,
      );
    } else {
      for (let i = 0; i < unitCount; i++) {
        // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
        const [namePtr, nameLen] = service_get_unit_name(svc, i);
        const unitName = dec.decode(
          new Uint8Array(memory.buffer, namePtr >>> 0, nameLen >>> 0),
        );
        const played = service_get_unit_played(svc, i) !== 0;
        const expected = snapshot.units[i];
        if (unitName !== expected.name || played !== expected.played) {
          failures.push(`${stem}.toml: unit[${i}] mismatch`);
        }
      }
    }

    // Events
    const eventCount = service_get_event_count(svc);
    if (eventCount !== snapshot.events.length) {
      failures.push(
        `${stem}.toml: event count mismatch (got ${eventCount}, expected ${snapshot.events.length})`,
      );
    } else {
      for (let i = 0; i < eventCount; i++) {
        // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
        const [tick, unitNo, kind, value] = service_get_event(svc, i);
        const expected = snapshot.events[i];
        if (
          tick !== expected.tick || unitNo !== expected.unit_index ||
          kind !== expected.kind || value !== expected.value
        ) {
          failures.push(`${stem}.toml: event[${i}] mismatch`);
        }
      }
    }

    if (service_moo_preparation(svc, 0, 0, 0) !== 0) {
      failures.push(`${name}: service_moo_preparation failed`);
      service_free(svc);
      continue;
    }

    const channels = 2;
    const sampleRate = 44100;
    const chunkSize = channels * 2 * 4096;
    const bufPtr = alloc(chunkSize);

    const chunks: Uint8Array[] = [];
    while (true) {
      // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
      const [, written] = service_moo(svc, bufPtr, chunkSize);
      if (written === 0) break;
      chunks.push(new Uint8Array(memory.buffer, bufPtr, written >>> 0).slice());
    }

    dealloc(bufPtr, chunkSize);
    service_free(svc);

    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      pcm.set(c, off);
      off += c.length;
    }

    const wav = pcmToWav(pcm, channels, sampleRate);
    const wavPath = join(snapshotDir, `${stem}.wav`);
    const expected = await Deno.readFile(wavPath);

    const { ok, maxDiff } = wavMatches(wav, expected);
    if (!ok) {
      failures.push(`${wavPath} (maxDiff=${maxDiff})`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Decoded output does not match reference (${failures.length} file(s)):\n${
        failures.join("\n")
      }`,
    );
  }
});

Deno.test("decoded ptnoise matches reference (wasm)", async () => {
  const sampleDir = join(projectRoot, "tests/sample/ptnoise");
  const snapshotDir = join(projectRoot, "tests/snapshots/ptnoise");

  const names: string[] = [];
  for await (const entry of Deno.readDir(sampleDir)) {
    if (entry.isFile && entry.name.endsWith(".ptnoise")) names.push(entry.name);
  }
  names.sort();

  if (names.length === 0) {
    throw new Error("no .ptnoise files found in tests/sample/ptnoise/");
  }

  const failures: string[] = [];
  const svc = service_new(2, 44100);

  const channels = 2;
  const sampleRate = 44100;

  for (const name of names) {
    const stem = name.slice(0, -8); // remove ".ptnoise"
    const ptnoiseData = await Deno.readFile(join(sampleDir, name));

    const dataPtr = alloc(ptnoiseData.length);
    new Uint8Array(memory.buffer, dataPtr, ptnoiseData.length).set(
      ptnoiseData,
    );

    // @ts-expect-error: Type support for Wasm Multi-Value is not available yet
    const [samplesPtr, samplesLen] = service_render_noise(
      svc,
      dataPtr,
      ptnoiseData.length,
    );
    dealloc(dataPtr, ptnoiseData.length);

    if (samplesPtr === 0) {
      failures.push(`${name}: service_render_noise failed`);
      continue;
    }

    const samples = new Uint8Array(
      memory.buffer,
      samplesPtr >>> 0,
      samplesLen >>> 0,
    )
      .slice();
    dealloc(samplesPtr, samplesLen);

    const wav = pcmToWav(samples, channels, sampleRate);
    const wavPath = join(snapshotDir, `${stem}.wav`);
    const expected = await Deno.readFile(wavPath);

    const { ok, maxDiff } = wavMatches(wav, expected);
    if (!ok) {
      failures.push(`${wavPath} (maxDiff=${maxDiff})`);
    }
  }

  service_free(svc);

  if (failures.length > 0) {
    throw new Error(
      `Decoded output does not match reference (${failures.length} file(s)):\n${
        failures.join("\n")
      }`,
    );
  }
});
