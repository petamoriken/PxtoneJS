import {
  alloc,
  dealloc,
  memory,
  service_free,
  service_get_beat_num,
  service_get_beat_tempo,
  service_get_channels,
  service_get_event_clock,
  service_get_event_count,
  service_get_event_kind,
  service_get_event_unit_index,
  service_get_event_value,
  service_get_last_measure,
  service_get_measure_num,
  service_get_repeat_measure,
  service_get_sample_rate,
  service_get_text_comment,
  service_get_text_name,
  service_get_unit_count,
  service_get_unit_name,
  service_get_unit_played,
  service_is_end_vomit,
  service_moo,
  service_moo_preparation,
  service_new,
  service_read,
  service_render_noise,
  service_tones_ready,
} from "../src/pxtone.wasm";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseToml } from "@std/toml";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

interface PtcopSnapshot {
  text: { name: string; comment: string };
  master: {
    beat_clock: number;
    beat_num: number;
    beat_tempo: number;
    measure_num: number;
    repeat_measure: number;
    last_measure: number;
  };
  units: Array<{ name: string; played: boolean }>;
  events: Array<
    { clock: number; unit_index: number; kind: number; value: number }
  >;
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

    const svc = service_new();

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

    const lenPtr = alloc(4);

    // Text
    {
      const namePtr = service_get_text_name(svc, lenPtr);
      const nameLen = new Uint32Array(memory.buffer, lenPtr, 1)[0];
      const textName = namePtr !== 0
        ? decSjis.decode(new Uint8Array(memory.buffer, namePtr, nameLen))
        : "";
      const commentPtr = service_get_text_comment(svc, lenPtr);
      const commentLen = new Uint32Array(memory.buffer, lenPtr, 1)[0];
      const textComment = commentPtr !== 0
        ? decSjis.decode(new Uint8Array(memory.buffer, commentPtr, commentLen))
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
      const beatNum = service_get_beat_num(svc);
      const beatTempo = service_get_beat_tempo(svc);
      const measureNum = service_get_measure_num(svc);
      const repeatMeasure = service_get_repeat_measure(svc);
      const lastMeasure = service_get_last_measure(svc);
      const m = snapshot.master;
      if (
        beatNum !== m.beat_num ||
        Math.abs(beatTempo - m.beat_tempo) >= 0.001 ||
        measureNum !== m.measure_num ||
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
        const namePtr = service_get_unit_name(svc, i, lenPtr);
        const nameLen = new Uint32Array(memory.buffer, lenPtr, 1)[0];
        const unitName = dec.decode(
          new Uint8Array(memory.buffer, namePtr, nameLen),
        );
        const played = service_get_unit_played(svc, i) !== 0;
        const expected = snapshot.units[i];
        if (unitName !== expected.name || played !== expected.played) {
          failures.push(`${stem}.toml: unit[${i}] mismatch`);
        }
      }
    }

    dealloc(lenPtr, 4);

    // Events
    const eventCount = service_get_event_count(svc);
    if (eventCount !== snapshot.events.length) {
      failures.push(
        `${stem}.toml: event count mismatch (got ${eventCount}, expected ${snapshot.events.length})`,
      );
    } else {
      for (let i = 0; i < eventCount; i++) {
        const clock = service_get_event_clock(svc, i);
        const unitNo = service_get_event_unit_index(svc, i);
        const kind = service_get_event_kind(svc, i);
        const value = service_get_event_value(svc, i);
        const expected = snapshot.events[i];
        if (
          clock !== expected.clock || unitNo !== expected.unit_index ||
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

    const channels = service_get_channels(svc);
    const sampleRate = service_get_sample_rate(svc);
    const chunkSize = channels * 2 * 4096;
    const bufPtr = alloc(chunkSize);

    const chunks: Uint8Array[] = [];
    while (service_is_end_vomit(svc) === 0) {
      if (service_moo(svc, bufPtr, chunkSize) === 0) break;
      chunks.push(new Uint8Array(memory.buffer, bufPtr, chunkSize).slice());
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

    if (
      wav.length !== expected.length || wav.some((b, i) => b !== expected[i])
    ) {
      failures.push(wavPath);
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
  const svc = service_new();

  // Allocate output pointer slots (4 bytes each; u32 on wasm32)
  const outChannels = alloc(4);
  const outSampleRate = alloc(4);
  const outSamplesLen = alloc(4);

  for (const name of names) {
    const stem = name.slice(0, -8); // remove ".ptnoise"
    const ptnoiseData = await Deno.readFile(join(sampleDir, name));

    const dataPtr = alloc(ptnoiseData.length);
    new Uint8Array(memory.buffer, dataPtr, ptnoiseData.length).set(
      ptnoiseData,
    );

    const samplesPtr = service_render_noise(
      svc,
      dataPtr,
      ptnoiseData.length,
      outChannels,
      outSampleRate,
      outSamplesLen,
    );
    dealloc(dataPtr, ptnoiseData.length);

    if (samplesPtr === 0) {
      failures.push(`${name}: service_render_noise failed`);
      continue;
    }

    const channels = new Uint32Array(memory.buffer, outChannels, 1)[0];
    const sampleRate = new Uint32Array(memory.buffer, outSampleRate, 1)[0];
    const samplesLen = new Uint32Array(memory.buffer, outSamplesLen, 1)[0];

    const samples = new Uint8Array(memory.buffer, samplesPtr, samplesLen)
      .slice();
    dealloc(samplesPtr, samplesLen);

    const wav = pcmToWav(samples, channels, sampleRate);
    const wavPath = join(snapshotDir, `${stem}.wav`);
    const expected = await Deno.readFile(wavPath);

    if (
      wav.length !== expected.length || wav.some((b, i) => b !== expected[i])
    ) {
      failures.push(wavPath);
    }
  }

  dealloc(outChannels, 4);
  dealloc(outSampleRate, 4);
  dealloc(outSamplesLen, 4);
  service_free(svc);

  if (failures.length > 0) {
    throw new Error(
      `Decoded output does not match reference (${failures.length} file(s)):\n${
        failures.join("\n")
      }`,
    );
  }
});
