import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { parse as parseToml } from "@std/toml";

import { Pxtone } from "../src/Pxtone.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Mock AudioData (used by stream() and decodeNoiseData() via new AudioData({...}))
class MockAudioData {
  readonly format: string;
  readonly sampleRate: number;
  readonly numberOfFrames: number;
  readonly numberOfChannels: number;
  readonly timestamp: number;
  readonly data: ArrayBuffer;

  constructor(init: {
    format: string;
    sampleRate: number;
    numberOfFrames: number;
    numberOfChannels: number;
    timestamp: number;
    data: BufferSource;
  }) {
    this.format = init.format;
    this.sampleRate = init.sampleRate;
    this.numberOfFrames = init.numberOfFrames;
    this.numberOfChannels = init.numberOfChannels;
    this.timestamp = init.timestamp;
    const { data } = init;
    this.data = data instanceof ArrayBuffer
      ? data
      : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
}

(globalThis as Record<string, unknown>).AudioData = MockAudioData;

// Converts f32-planar MockAudioData back to s16 interleaved PCM for WAV comparison.
function audioDataToPcm(audioData: MockAudioData): Uint8Array {
  const { numberOfFrames: frames, numberOfChannels: channels, data } = audioData;
  const f32 = new Float32Array(data);
  const int16 = new Int16Array(frames * channels);
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      int16[i * channels + ch] = f32[ch * frames + i] * 0x8000;
    }
  }
  return new Uint8Array(int16.buffer);
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

interface PtcopSnapshot {
  units: Array<{ name: string; played: boolean }>;
  events: Array<
    { tick: number; unit_index: number; kind: number; value: number }
  >;
}

Deno.test("decoded ptcop matches reference (Pxtone)", async () => {
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

  for (const name of names) {
    const stem = name.slice(0, -6);
    const fileData = await Deno.readFile(join(sampleDir, name));
    const tomlText = await Deno.readTextFile(join(snapshotDir, `${stem}.toml`));
    const snapshot = parseToml(tomlText) as unknown as PtcopSnapshot;

    using pxtone = new Pxtone();

    try {
      pxtone.read(fileData);
    } catch (e) {
      failures.push(`${name}: ${e}`);
      continue;
    }

    if (pxtone.units.length !== snapshot.units.length) {
      failures.push(
        `${stem}: unit count mismatch (got ${pxtone.units.length}, expected ${snapshot.units.length})`,
      );
    } else {
      for (let i = 0; i < pxtone.units.length; i++) {
        const { name: unitName, played } = pxtone.units[i];
        const exp = snapshot.units[i];
        if (unitName !== exp.name || played !== exp.played) {
          failures.push(`${stem}: unit[${i}] mismatch`);
        }
      }
    }

    if (pxtone.events.length !== snapshot.events.length) {
      failures.push(
        `${stem}: event count mismatch (got ${pxtone.events.length}, expected ${snapshot.events.length})`,
      );
    } else {
      for (let i = 0; i < pxtone.events.length; i++) {
        const { tick, unit, kind, value } = pxtone.events[i];
        const exp = snapshot.events[i];
        const unitIndex = pxtone.units.indexOf(unit);
        if (
          tick !== exp.tick || unitIndex !== exp.unit_index ||
          kind !== exp.kind || value !== exp.value
        ) {
          failures.push(`${stem}: event[${i}] mismatch`);
        }
      }
    }

    const pcmChunks: Uint8Array[] = [];
    const reader = pxtone.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pcmChunks.push(audioDataToPcm(value as unknown as MockAudioData));
    }

    const totalLen = pcmChunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Uint8Array(totalLen);
    let off = 0;
    for (const c of pcmChunks) {
      pcm.set(c, off);
      off += c.length;
    }

    const wav = pcmToWav(pcm, pxtone.channels!, pxtone.sampleRate!);
    const expected = await Deno.readFile(join(snapshotDir, `${stem}.wav`));
    const compareLen = Math.min(wav.length - 44, expected.length - 44);
    if (
      wav.subarray(44, 44 + compareLen).some((b, i) => b !== expected[44 + i])
    ) {
      failures.push(`${stem}: PCM mismatch`);
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

Deno.test("decoded ptnoise matches reference (Pxtone)", async () => {
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
  using pxtone = new Pxtone();

  for (const name of names) {
    const stem = name.slice(0, -8);
    const fileData = await Deno.readFile(join(sampleDir, name));

    let result;
    try {
      result = await pxtone.decodeNoiseData(fileData);
    } catch (e) {
      failures.push(`${name}: ${e}`);
      continue;
    }

    const buf = result as unknown as MockAudioData;
    const wav = pcmToWav(audioDataToPcm(buf), pxtone.channels, pxtone.sampleRate);
    const expected = await Deno.readFile(join(snapshotDir, `${stem}.wav`));
    if (
      wav.length !== expected.length || wav.some((b, i) => b !== expected[i])
    ) {
      failures.push(`${stem}: PCM mismatch`);
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

Deno.test("Pxtone getters are guarded by state", async () => {
  const sampleDir = join(projectRoot, "tests/sample/ptcop");
  const names: string[] = [];

  for await (const entry of Deno.readDir(sampleDir)) {
    if (entry.isFile && entry.name.endsWith(".ptcop")) names.push(entry.name);
  }
  names.sort();

  if (names.length === 0) {
    throw new Error("no .ptcop files found in tests/sample/ptcop/");
  }
  const fileData = await Deno.readFile(join(sampleDir, names[0]));

  const pxtone = new Pxtone();

  // --- idle ---

  assertEquals(pxtone.ticksPerBeat, null);
  assertEquals(pxtone.beatsPerMeasure, null);
  assertEquals(pxtone.beatTempo, null);
  assertEquals(pxtone.measureCount, null);
  assertEquals(pxtone.tickCount, null);
  assertEquals(pxtone.duration, null);

  assertEquals(pxtone.loopStartMeasure, null);
  assertEquals(pxtone.loopEndMeasure, null);
  assertEquals(pxtone.loopStart, null);
  assertEquals(pxtone.loopEnd, null);
  assertEquals(pxtone.currentTick, 0);
  assertEquals(pxtone.currentTime, 0);

  assertEquals(pxtone.units.length, 0);
  assertEquals(pxtone.events.length, 0);

  assertThrows(() => pxtone.stream());

  // --- ready ---

  pxtone.read(fileData);

  assertNotEquals(pxtone.ticksPerBeat, null);
  assertNotEquals(pxtone.beatsPerMeasure, null);
  assertNotEquals(pxtone.beatTempo, null);
  assertNotEquals(pxtone.measureCount, null);
  assertNotEquals(pxtone.tickCount, null);
  assertNotEquals(pxtone.duration, null);

  assertNotEquals(pxtone.loopStartMeasure, null);
  assertNotEquals(pxtone.loopEndMeasure, null);
  assertNotEquals(pxtone.loopStart, null);
  assertNotEquals(pxtone.loopEnd, null);
  assertEquals(pxtone.currentTick, 0);
  assertEquals(pxtone.currentTime, 0);

  assert(pxtone.units.length > 0);
  assert(pxtone.events.length > 0);

  // --- streaming ---

  const stream = pxtone.stream();
  const reader = stream.getReader();
  await reader.read();
  await reader.read();

  assertNotEquals(pxtone.ticksPerBeat, null);
  assertNotEquals(pxtone.beatsPerMeasure, null);
  assertNotEquals(pxtone.beatTempo, null);
  assertNotEquals(pxtone.measureCount, null);
  assertNotEquals(pxtone.tickCount, null);
  assertNotEquals(pxtone.duration, null);

  assertNotEquals(pxtone.loopStartMeasure, null);
  assertNotEquals(pxtone.loopEndMeasure, null);
  assertNotEquals(pxtone.loopStart, null);
  assertNotEquals(pxtone.loopEnd, null);
  assert(pxtone.currentTick > 0);
  assert(pxtone.currentTime > 0);

  assert(pxtone.units.length > 0);
  assert(pxtone.events.length > 0);

  assertThrows(() => pxtone.read(fileData));
  assertThrows(() => pxtone.stream());

  // --- ready ---

  reader.releaseLock();
  await stream.cancel();

  assertNotEquals(pxtone.ticksPerBeat, null);
  assertNotEquals(pxtone.beatsPerMeasure, null);
  assertNotEquals(pxtone.beatTempo, null);
  assertNotEquals(pxtone.measureCount, null);
  assertNotEquals(pxtone.tickCount, null);
  assertNotEquals(pxtone.duration, null);

  assertNotEquals(pxtone.loopStartMeasure, null);
  assertNotEquals(pxtone.loopEndMeasure, null);
  assertNotEquals(pxtone.loopStart, null);
  assertNotEquals(pxtone.loopEnd, null);
  assert(pxtone.currentTick > 0);
  assert(pxtone.currentTime > 0);

  assert(pxtone.units.length > 0);
  assert(pxtone.events.length > 0);

  // --- idle ---

  pxtone.clear();

  assertEquals(pxtone.ticksPerBeat, null);
  assertEquals(pxtone.beatsPerMeasure, null);
  assertEquals(pxtone.beatTempo, null);
  assertEquals(pxtone.measureCount, null);
  assertEquals(pxtone.tickCount, null);
  assertEquals(pxtone.duration, null);

  assertEquals(pxtone.loopStartMeasure, null);
  assertEquals(pxtone.loopEndMeasure, null);
  assertEquals(pxtone.loopStart, null);
  assertEquals(pxtone.loopEnd, null);
  assertEquals(pxtone.currentTick, 0);
  assertEquals(pxtone.currentTime, 0);

  assertEquals(pxtone.units.length, 0);
  assertEquals(pxtone.events.length, 0);

  // --- disposed ---

  pxtone[Symbol.dispose]();

  assertEquals(pxtone.ticksPerBeat, null);
  assertEquals(pxtone.beatsPerMeasure, null);
  assertEquals(pxtone.beatTempo, null);
  assertEquals(pxtone.measureCount, null);
  assertEquals(pxtone.tickCount, null);
  assertEquals(pxtone.duration, null);

  assertEquals(pxtone.loopStartMeasure, null);
  assertEquals(pxtone.loopEndMeasure, null);
  assertEquals(pxtone.loopStart, null);
  assertEquals(pxtone.loopEnd, null);
  assertEquals(pxtone.currentTick, 0);
  assertEquals(pxtone.currentTime, 0);

  assertEquals(pxtone.units.length, 0);
  assertEquals(pxtone.events.length, 0);
});
