<br><br><br><br>

<div align="center">
	<img src="pxtonejs5x.png" alt="PxtoneJS"><br>
	Play <a href="https://pxtone.org/" target="_blank">Pxtone Collage</a> files in the browser via WebCodecs and Web Audio API.
</div>

<br><br><br><br>

<p align="center">
	<a href="https://github.com/petamoriken/PxtoneJS/blob/master/LICENSE.md" target="_blank"><img src="https://img.shields.io/npm/l/pxtone.svg?style=flat-square" alt="License"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/issues" target="_blank"><img src="https://img.shields.io/github/issues/petamoriken/PxtoneJS.svg?style=flat-square" alt="GitHub issues"></a>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/v/pxtone.svg?style=flat-square" alt="npm version"></a>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/dt/pxtone.svg?style=flat-square" alt="npm downloads"></a>
</p>

## Demo

[PxtoneJS v4 Demo](https://codepen.io/petamoriken/pen/JGWQOE/)

## Install

```sh
npm install pxtone
```

## Usage

### Playing a `.ptcop` / `.pttune` file

`Pxtone` holds a native WebAssembly resource. While it will be automatically released eventually, it
is recommended to use the `using` declaration (Explicit Resource Management) or call
`[Symbol.dispose]()` manually to ensure the resource is disposed of as soon as it is no longer
needed.

`stream()` returns a `ReadableStream<AudioData>` (WebCodecs, format `"s16"`). Feed the chunks into
an `AudioWorkletNode` or any other WebCodecs-aware pipeline.

```ts
import { Pxtone } from "pxtone";

const response = await fetch("song.ptcop");
const fileBytes = new Uint8Array(await response.arrayBuffer());

using pxtone = new Pxtone();
pxtone.read(fileBytes);

console.log(pxtone.name);
console.log(pxtone.duration); // total length in seconds

const stream = pxtone.stream({ loop: true });
const reader = stream.getReader();

while (true) {
  const { done, value: audioData } = await reader.read();
  if (done) break;
  // pass audioData to an AudioWorklet, MediaStreamTrackGenerator, etc.
}
```

### Decoding a `.ptnoise` file

```ts
import { Pxtone } from "pxtone";

const response = await fetch("drum.ptnoise");
const fileBytes = new Uint8Array(await response.arrayBuffer());

using pxtone = new Pxtone();
const buffer = await pxtone.decodeNoiseData(fileBytes);

const ctx = new AudioContext();
const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.start();
```

## API

### `new Pxtone()`

Creates an instance backed by a WebAssembly service.

### Properties

#### Audio output

| Property     | Type    | Description                                |
| ------------ | ------- | ------------------------------------------ |
| `channels`   | `2`     | Output channel count (always stereo)       |
| `sampleRate` | `44100` | Output sample rate in Hz (always 44.1 kHz) |

#### Metadata (available after `read()`)

| Property  | Type             | Description                      |
| --------- | ---------------- | -------------------------------- |
| `name`    | `string \| null` | Song title (Shift-JIS decoded)   |
| `comment` | `string \| null` | Song comment (Shift-JIS decoded) |

#### Master (available after `read()`)

| Property          | Type             | Description               |
| ----------------- | ---------------- | ------------------------- |
| `ticksPerBeat`    | `number \| null` | Ticks per beat            |
| `beatsPerMeasure` | `number \| null` | Beats per measure         |
| `beatTempo`       | `number \| null` | Tempo in BPM              |
| `measureCount`    | `number \| null` | Total number of measures  |
| `tickCount`       | `number \| null` | Total length in ticks     |
| `duration`        | `number \| null` | Total duration in seconds |

#### Loop (available after `read()`)

| Property           | Type             | Description                     |
| ------------------ | ---------------- | ------------------------------- |
| `loopStartMeasure` | `number \| null` | Loop start position in measures |
| `loopEndMeasure`   | `number \| null` | Loop end position in measures   |
| `loopStart`        | `number \| null` | Loop start position in seconds  |
| `loopEnd`          | `number \| null` | Loop end position in seconds    |

### Playback

| Property      | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| `currentTick` | `number` | Current playback position in ticks   |
| `currentTime` | `number` | Current playback position in seconds |

#### Song data

| Property | Type                     | Description           |
| -------- | ------------------------ | --------------------- |
| `units`  | `readonly PxtoneUnit[]`  | Instrument tracks     |
| `events` | `readonly PxtoneEvent[]` | Automation event list |

### Methods

#### `read(buffer: ArrayBuffer | Uint8Array): void`

Loads a `.ptcop` or `.pttune` file and prepares it for playback. Throws if the file is invalid or a
stream is currently active.

#### `stream(options?: StreamOptions): ReadableStream<AudioData>`

Returns a `ReadableStream` that yields signed 16-bit interleaved PCM chunks as `AudioData` objects
(format `"s16"`). Only one stream may be active at a time.

```ts
export interface StreamOptions {
  /** Playback start position in seconds. Default: 0 (beginning). */
  startTime?: number;
  /** Units whose `played` flag is false are silenced. */
  unitMute?: boolean;
  /** Loop playback from the song's repeat point. */
  loop?: boolean;
  /** Number of frames per channel per chunk. Default: 1024. */
  numberOfFrames?: number;
  /** Backpressure threshold for the underlying `ReadableStream`. Default: 1. */
  highWaterMark?: number;
  /** AbortSignal to cancel the stream early. */
  signal?: AbortSignal;
}
```

#### `clear(): void`

Resets the instance to its initial idle state, discarding all loaded song data.

#### `decodeNoiseData(buffer: ArrayBuffer | Uint8Array): Promise<AudioBuffer>`

Decodes a `.ptnoise` file and returns an `AudioBuffer` ready for use with the Web Audio API.

### `PxtoneUnit`

| Property | Type      | Description                            |
| -------- | --------- | -------------------------------------- |
| `name`   | `string`  | Display name                           |
| `played` | `boolean` | Whether the unit is active (not muted) |

#### `togglePlayed(force?: boolean): void`

Toggles the `played` flag for this unit. If `force` is provided, the flag is set explicitly rather
than toggled.

### `PxtoneEvent`

| Property | Type              | Description                                     |
| -------- | ----------------- | ----------------------------------------------- |
| `tick`   | `number`          | Tick position                                   |
| `unit`   | `PxtoneUnit`      | Target unit in the loaded song                  |
| `kind`   | `PxtoneEventKind` | Event type (see `PxtoneEvent.KIND_*` constants) |
| `value`  | `number`          | Event payload                                   |

## WebAssembly

`src/pxtone.wasm` is built from [petamoriken/pxtone-rs](https://github.com/petamoriken/pxtone-rs), a
Rust port of the Pxtone Collage library.

## License

[MIT](LICENSE.md)

This software includes the following third-party components:

- [lewton](https://github.com/RustAudio/lewton) (MIT or Apache-2.0)
