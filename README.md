<br><br><br><br>

<div align="center">
	<img src="pxtonejs5x.png" alt="PxtoneJS"><br>
	Play Pxtone Collage <a href="https://pxtone.org/" target="_blank">"pxtone"</a> files in the browser.
</div>

<br><br><br><br>

<p align="center">
  <a href="https://www.npmjs.com/package/pxtone"><img src="https://img.shields.io/npm/dw/pxtone?logo=npm&amp;style=flat-square" alt="npm downloads"></a>
  <a href="https://www.npmjs.com/package/pxtone"><img src="https://img.shields.io/npm/v/pxtone.svg?label=version&amp;logo=npm&amp;style=flat-square" alt="npm version"></a>
  <a href="https://jsr.io/@petamoriken/pxtone"><img src="https://jsr.io/badges/@petamoriken/pxtone?label=version&amp;style=flat-square" alt="jsr version"></a>
  <br>
  <a href="https://www.npmjs.com/package/pxtone?activeTab=dependencies"><img src="https://img.shields.io/badge/dependencies-none-brightgreen?style=flat-square" alt="dependencies"></a>
  <a href="https://github.com/petamoriken/PxtoneJS/blob/main/LICENSE.md"><img src="https://img.shields.io/npm/l/pxtone.svg?style=flat-square" alt="license"></a>
</p>

## Demo

[PxtoneJS v4 Demo](https://codepen.io/petamoriken/pen/JGWQOE/)

## Install

### npm

```sh
npm install pxtone
```

### JSR (Deno)

```sh
deno add jsr:@petamoriken/pxtone
```

### Direct download

Bundled scripts are available on
[GitHub Releases](https://github.com/petamoriken/PxtoneJS/releases):

- `Pxtone.js` — IIFE bundle (exposes a `Pxtone` namespace as a global, e.g. `Pxtone.Pxtone`,
  `Pxtone.PxtoneError`)
- `Pxtone.mjs` — ES Modules bundle

## Usage

### Playing a `.ptcop` / `.pttune` file

`Pxtone` holds a native WebAssembly resource. While it will be automatically released eventually, it
is recommended to call `close()` when the instance is no longer needed to ensure the resource is
released promptly. If `Symbol.dispose` is available in your environment, you can also use the
`using` declaration (Explicit Resource Management).

`stream()` returns a `ReadableStream<AudioData>` (format `"f32-planar"`). To play back with the Web
Audio API using `AudioBufferSourceNode`, schedule each chunk ahead of time:

```ts
const response = await fetch("song.ptcop");
const fileBytes = await response.arrayBuffer();

const BUFFER_AHEAD = 0.5; // seconds

const ctx = new AudioContext();
const pxtone = new Pxtone({ sampleRate: ctx.sampleRate });
pxtone.read(fileBytes);

const stream = pxtone.stream({ loop: true });
const reader = stream.getReader();
let nextStartTime = ctx.currentTime + 0.1;

async function scheduleMore() {
  while (nextStartTime < ctx.currentTime + BUFFER_AHEAD) {
    const { done, value: audioData } = await reader.read();
    if (done) return;

    const buffer = new AudioBuffer({
      numberOfChannels: audioData.numberOfChannels,
      length: audioData.numberOfFrames,
      sampleRate: audioData.sampleRate,
    });
    for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
      audioData.copyTo(buffer.getChannelData(ch), { planeIndex: ch });
    }
    audioData.close();

    if (nextStartTime < ctx.currentTime) nextStartTime = ctx.currentTime + 0.05;
    const source = new AudioBufferSourceNode(ctx, { buffer });
    source.connect(ctx.destination);
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
  }
}

await scheduleMore();
setInterval(scheduleMore, 100);

// When stopping playback:
// pxtone.close();
```

Each `AudioData` chunk can also be forwarded to an `AudioWorkletNode`, `MediaStreamTrackGenerator`,
or other consumers:

```ts
const response = await fetch("song.ptcop");
const fileBytes = await response.arrayBuffer();

const pxtone = new Pxtone();
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
pxtone.close();
```

### Decoding a `.ptnoise` file

`decodeNoiseData()` returns an `AudioData` with format `"f32-planar"`. To play it back with the Web
Audio API, copy each channel plane into an `AudioBuffer`:

```ts
const response = await fetch("drum.ptnoise");
const fileBytes = await response.arrayBuffer();

const ctx = new AudioContext();
const pxtone = new Pxtone({ sampleRate: ctx.sampleRate });
const audioData = await pxtone.decodeNoiseData(fileBytes);
pxtone.close();

const buffer = new AudioBuffer({
  numberOfChannels: audioData.numberOfChannels,
  length: audioData.numberOfFrames,
  sampleRate: audioData.sampleRate,
});
for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
  audioData.copyTo(buffer.getChannelData(ch), { planeIndex: ch });
}
audioData.close();

const source = new AudioBufferSourceNode(ctx, { buffer });
source.connect(ctx.destination);
source.start();
```

## API

### `new Pxtone(options?: PxtoneOptions)`

Creates an instance backed by a WebAssembly service.

```ts
export interface PxtoneOptions {
  /**
   * Number of output channels. Must be `1` (mono) or `2` (stereo).
   * @default 2
   */
  numberOfChannels?: 1 | 2;
  /**
   * Output sample rate in Hz.
   * @default 44100
   */
  sampleRate?: number;
}
```

### Properties

#### Audio output

| Property           | Type     | Description              |
| ------------------ | -------- | ------------------------ |
| `numberOfChannels` | `1 \| 2` | Output channel count     |
| `sampleRate`       | `number` | Output sample rate in Hz |

#### Metadata (available after `read()`)

| Property  | Type             | Description                      |
| --------- | ---------------- | -------------------------------- |
| `name`    | `string \| null` | Song title (Shift-JIS decoded)   |
| `comment` | `string \| null` | Song comment (Shift-JIS decoded) |

#### Master (available after `read()`)

| Property           | Type             | Description               |
| ------------------ | ---------------- | ------------------------- |
| `ticksPerBeat`     | `number \| null` | Ticks per beat            |
| `beatsPerMeasure`  | `number \| null` | Beats per measure         |
| `beatTempo`        | `number \| null` | Tempo in BPM              |
| `numberOfMeasures` | `number \| null` | Total number of measures  |
| `numberOfTicks`    | `number \| null` | Total length in ticks     |
| `duration`         | `number \| null` | Total duration in seconds |

#### Loop (available after `read()`)

| Property           | Type             | Description                     |
| ------------------ | ---------------- | ------------------------------- |
| `loopStartMeasure` | `number \| null` | Loop start position in measures |
| `loopEndMeasure`   | `number \| null` | Loop end position in measures   |
| `loopStart`        | `number \| null` | Loop start position in seconds  |
| `loopEnd`          | `number \| null` | Loop end position in seconds    |

#### Playback

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

#### `static Pxtone.validate(buffer: ArrayBuffer | Uint8Array): boolean`

Checks whether `buffer` is a valid `.ptcop` or `.pttune` file without loading it. Returns `true` if
valid, `false` otherwise.

#### `static Pxtone.validateNoiseData(buffer: ArrayBuffer | Uint8Array): boolean`

Checks whether `buffer` is a valid `.ptnoise` file without loading it. Returns `true` if valid,
`false` otherwise.

#### `read(buffer: ArrayBuffer | Uint8Array): void`

Loads a `.ptcop` or `.pttune` file and prepares it for playback. Throws a `PxtoneError` if the file
is invalid or a stream is currently active.

#### `stream(options?: StreamOptions): ReadableStream<AudioData>`

Returns a `ReadableStream` that yields PCM chunks as `AudioData` objects (format `"f32-planar"`).
Each chunk has at most `numberOfFrames` frames; the final chunk may be shorter. Only one stream may
be active at a time. Throws a `PxtoneError` if no data has been loaded or a stream is already
active.

```ts
export interface StreamOptions {
  /**
   * Playback start position in seconds.
   * @default 0
   */
  startTime?: number;
  /**
   * Units whose `played` flag is false are silenced.
   * @default false
   */
  unitMute?: boolean;
  /**
   * Loop playback from the song's repeat point.
   * @default false
   */
  loop?: boolean;
  /**
   * Maximum number of frames per channel per chunk. The final chunk may be shorter.
   * @default 1024
   */
  numberOfFrames?: number;
  /**
   * Backpressure threshold for the underlying `ReadableStream`.
   * @default 1
   */
  highWaterMark?: number;
  /** AbortSignal to cancel the stream early. */
  signal?: AbortSignal;
}
```

#### `close(): void`

Releases the underlying Wasm resource. Safe to call multiple times; subsequent calls are no-ops. If
`Symbol.dispose` is available in the runtime environment, it is aliased to `close()` so the `using`
declaration also works.

#### `clear(): void`

Resets the instance to its initial idle state, discarding all loaded song data.

#### `decodeNoiseData(buffer: ArrayBuffer | Uint8Array): Promise<AudioData>`

Decodes a `.ptnoise` file and returns an `AudioData` with format `"f32-planar"`. Throws a
`PxtoneError` if the data is invalid.

### `PxtoneError`

Thrown by `Pxtone` methods on operation failures. Extends `Error` with an optional `code` property
for programmatic error handling.

| `code`                          | Static constant                                | Description                                     |
| ------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `"DISPOSED"`                    | `PxtoneError.CODE_DISPOSED`                    | The instance has already been disposed.         |
| `"STREAMING_ACTIVE"`            | `PxtoneError.CODE_STREAMING_ACTIVE`            | Operation not allowed while a stream is active. |
| `"NOT_READY"`                   | `PxtoneError.CODE_NOT_READY`                   | `read()` has not been called yet.               |
| `"READ_FAILED"`                 | `PxtoneError.CODE_READ_FAILED`                 | Failed to load the pxtone data.                 |
| `"TONES_READY_FAILED"`          | `PxtoneError.CODE_TONES_READY_FAILED`          | Failed to initialize audio tones.               |
| `"PLAYBACK_PREPARATION_FAILED"` | `PxtoneError.CODE_PLAYBACK_PREPARATION_FAILED` | Failed to prepare audio playback.               |
| `"RENDER_NOISE_FAILED"`         | `PxtoneError.CODE_RENDER_NOISE_FAILED`         | Failed to render noise data.                    |

```ts
try {
  pxtone.read(buffer);
} catch (e) {
  if (e instanceof PxtoneError && e.code === PxtoneError.CODE_READ_FAILED) {
    console.error("Invalid pxtone file");
  }
}
```

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

See [NOTICE.md](NOTICE.md) for third-party license notices.
