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
  service_set_unit_played,
  service_tones_ready,
} from "./pxtone.wasm";

/** Decoded noise waveform metadata returned by {@link Pxtone.decodeNoiseData}. */
export interface NoiseData {
  /** Number of output channels (1 = mono, 2 = stereo). */
  channels: 1 | 2;
  /** Sample rate in Hz. */
  sampleRate: number;
}

let setUnitPlayed!: (unit: PxtoneUnit, played: boolean) => void;

/** A single instrument track in a pxtone song. */
export class PxtoneUnit {
  readonly #name: string;
  #played: boolean;

  constructor(name: string, played: boolean) {
    this.#name = name;
    this.#played = played;
  }

  static {
    setUnitPlayed = (unit, played) => {
      unit.#played = played;
    };
  }

  /** Display name of this unit. */
  get name(): string {
    return this.#name;
  }

  /**
   * Whether this unit is active (not muted).
   * Can be toggled via {@link Pxtone.toggleUnitPlayed}.
   */
  get played(): boolean {
    return this.#played;
  }
}

/** No event / padding. */
export const EVENT_KIND_NULL = 0;
/** Note-on: begins a note. The `value` is the note length in ticks. */
export const EVENT_KIND_ON = 1;
/** Key (pitch). The `value` is encoded as `(octave * 12 + semitone) * 256`. */
export const EVENT_KIND_KEY = 2;
/** Pan (stereo position). `value` ranges from 0 (left) to 128 (center) to 256 (right). */
export const EVENT_KIND_PAN_VOLUME = 3;
/** Velocity (attack strength). `value` ranges from 0 to 128. */
export const EVENT_KIND_VELOCITY = 4;
/** Volume. `value` ranges from 0 to 128. */
export const EVENT_KIND_VOLUME = 5;
/** Portamento (pitch glide). `value` is the portamento length in ticks. */
export const EVENT_KIND_PORTAMENT = 6;
/** Beat clock: ticks per beat. */
export const EVENT_KIND_BEAT_CLOCK = 7;
/** Beat tempo in BPM (floating-point encoded as `Math.round(bpm * 100)`). */
export const EVENT_KIND_BEAT_TEMPO = 8;
/** Beats per measure. */
export const EVENT_KIND_BEAT_NUM = 9;
/** Repeat: marks the loop start measure. */
export const EVENT_KIND_REPEAT = 10;
/** Last: marks the loop end measure. */
export const EVENT_KIND_LAST = 11;
/** Voice number: selects which instrument voice to use. */
export const EVENT_KIND_VOICE_NO = 12;
/** Group number: assigns the unit to a group. */
export const EVENT_KIND_GROUP_NO = 13;
/** Tuning offset in semitones (floating-point encoded as `Math.round(semitones * 100)`). */
export const EVENT_KIND_TUNING = 14;
/** Time-based pan (auto-pan). `value` is the pan sweep period in ticks. */
export const EVENT_KIND_PAN_TIME = 15;

/** Union of all valid {@link PxtoneEvent} kind values. */
export type PxtoneEventKind =
  | typeof EVENT_KIND_NULL
  | typeof EVENT_KIND_ON
  | typeof EVENT_KIND_KEY
  | typeof EVENT_KIND_PAN_VOLUME
  | typeof EVENT_KIND_VELOCITY
  | typeof EVENT_KIND_VOLUME
  | typeof EVENT_KIND_PORTAMENT
  | typeof EVENT_KIND_BEAT_CLOCK
  | typeof EVENT_KIND_BEAT_TEMPO
  | typeof EVENT_KIND_BEAT_NUM
  | typeof EVENT_KIND_REPEAT
  | typeof EVENT_KIND_LAST
  | typeof EVENT_KIND_VOICE_NO
  | typeof EVENT_KIND_GROUP_NO
  | typeof EVENT_KIND_TUNING
  | typeof EVENT_KIND_PAN_TIME;

/** A single automation event in a pxtone song's event list. */
export class PxtoneEvent {
  readonly #clock: number;
  readonly #unitIndex: number;
  readonly #kind: PxtoneEventKind;
  readonly #value: number;

  constructor(
    clock: number,
    unitIndex: number,
    kind: PxtoneEventKind,
    value: number,
  ) {
    this.#clock = clock;
    this.#unitIndex = unitIndex;
    this.#kind = kind;
    this.#value = value;
  }

  /** Tick position at which this event fires. */
  get clock(): number {
    return this.#clock;
  }

  /** Index into {@link Pxtone.units} that this event targets. */
  get unitIndex(): number {
    return this.#unitIndex;
  }

  /** What this event controls. See the `EVENT_KIND_*` constants. */
  get kind(): PxtoneEventKind {
    return this.#kind;
  }

  /** The event's payload. Interpretation depends on {@link kind}. */
  get value(): number {
    return this.#value;
  }
}

/** Options for {@link Pxtone.stream}. */
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

/**
 * Main entry point for decoding and playing pxtone songs.
 *
 * Typical usage:
 * ```ts
 * using pxtone = new Pxtone();
 * pxtone.read(fileBytes);
 * const stream = pxtone.stream();
 * ```
 *
 * The instance holds a native Wasm resource and must be disposed when no
 * longer needed. Use the `using` declaration (Explicit Resource Management)
 * or call {@link Symbol.dispose} manually.
 */
export class Pxtone {
  static #sjisDecoder = new TextDecoder("shift-jis");

  static #registry = new FinalizationRegistry((ptr: number) => {
    service_free(ptr);
  });

  #ptr: number;
  #channels: 2;
  #sampleRate: 44100;

  #state: "idle" | "ready" | "streaming" | "disposed" = "idle";

  #name: string | null = null;
  #comment: string | null = null;
  #secondsPerMeasure: number | null = null;
  #measureNum: number | null = null;
  #repeatMeasure: number | null = null;
  #lastMeasure: number | null = null;

  #currentFrame = 0;
  #units: readonly PxtoneUnit[] = Object.freeze([]);
  #events: readonly PxtoneEvent[] = Object.freeze([]);

  constructor() {
    this.#ptr = service_new();
    this.#channels = service_get_channels(this.#ptr) as 2;
    this.#sampleRate = service_get_sample_rate(this.#ptr) as 44100;
    Pxtone.#registry.register(this, this.#ptr, this);
  }

  /**
   * Releases the underlying Wasm resource. Called automatically by `using`.
   * Safe to call multiple times; subsequent calls are no-ops.
   *
   * If called while a stream is active, the Wasm memory is not freed immediately —
   * it is freed when the next chunk is pulled (the stream will error) or when the
   * stream is cancelled.
   */
  [Symbol.dispose](): void {
    if (this.#state === "disposed") return;
    const wasStreaming = this.#state === "streaming";
    this.#state = "disposed";
    Pxtone.#registry.unregister(this);
    if (!wasStreaming) {
      service_free(this.#ptr);
    }
  }

  /** Number of output channels. */
  get channels(): 2 {
    return this.#channels;
  }

  /** Output sample rate in Hz. */
  get sampleRate(): 44100 {
    return this.#sampleRate;
  }

  /** Song title decoded from Shift-JIS, or `null` if not set. Available after {@link read}. */
  get name(): string | null {
    return this.#name;
  }

  /** Song comment decoded from Shift-JIS, or `null` if not set. Available after {@link read}. */
  get comment(): string | null {
    return this.#comment;
  }

  /** Total song duration in seconds. `null` before {@link read}. */
  get duration(): number | null {
    return this.#measureNum !== null ? this.#measureNum * this.#secondsPerMeasure! : null;
  }

  /** Loop start position in seconds. `null` before {@link read}. */
  get loopStart(): number | null {
    return this.#repeatMeasure !== null ? this.#repeatMeasure * this.#secondsPerMeasure! : null;
  }

  /** Loop end position in seconds. `null` before {@link read}. */
  get loopEnd(): number | null {
    return this.#lastMeasure !== null ? this.#lastMeasure * this.#secondsPerMeasure! : null;
  }

  /**
   * Current playback position in seconds, updated as each chunk is pulled
   * from the stream returned by {@link stream}.
   */
  get currentTime(): number {
    if (this.#sampleRate === null) return 0;
    const sampleRate = this.#sampleRate;
    const lastMeasure = this.#lastMeasure!;
    const repeatMeasure = this.#repeatMeasure!;
    if (repeatMeasure !== 0) {
      const spm = this.#secondsPerMeasure!;
      const loopEndFrame = Math.round(lastMeasure * spm * sampleRate);
      const loopStartFrame = Math.round(repeatMeasure * spm * sampleRate);
      const loopLength = Math.round(
        (lastMeasure - repeatMeasure) * spm * sampleRate,
      );
      if (loopLength > 0 && this.#currentFrame > loopEndFrame) {
        const position = loopStartFrame +
          (this.#currentFrame - loopEndFrame) % loopLength;
        return position / sampleRate;
      }
    }
    return this.#currentFrame / sampleRate;
  }

  /** Ordered list of instrument tracks in the loaded song. */
  get units(): readonly PxtoneUnit[] {
    return this.#units;
  }

  /** Ordered list of automation events in the loaded song. */
  get events(): readonly PxtoneEvent[] {
    return this.#events;
  }

  /**
   * Resets the instance to its initial idle state, releasing all song data.
   * @throws {Error} If the instance has been disposed, or a stream is active.
   */
  clear(): void {
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
    }
    if (this.#state === "streaming") {
      throw new Error("cannot call clear while streaming");
    }
    this.#state = "idle";
    this.#name = null;
    this.#comment = null;
    this.#secondsPerMeasure = null;
    this.#measureNum = null;
    this.#repeatMeasure = null;
    this.#lastMeasure = null;
    this.#currentFrame = 0;
    this.#units = Object.freeze([]);
    this.#events = Object.freeze([]);
  }

  /**
   * Loads a `.ptcop` or `.pttune` file and prepares it for playback.
   * Populates {@link channels}, {@link sampleRate}, {@link name}, {@link comment},
   * {@link duration}, {@link loopStart}, {@link loopEnd}, {@link units}, and {@link events}.
   *
   * @param buffer - Raw file bytes.
   * @throws {Error} If the instance has been disposed, called while a stream is active, or the file is invalid.
   */
  read(buffer: ArrayBuffer | Uint8Array): void {
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
    }
    if (this.#state === "streaming") {
      throw new Error("cannot call read while streaming");
    }
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const memPtr = alloc(bytes.length);
    try {
      new Uint8Array(memory.buffer, memPtr, bytes.length).set(bytes);
      if (service_read(this.#ptr, memPtr, bytes.length) !== 0) {
        throw new Error("service_read failed");
      }
    } finally {
      dealloc(memPtr, bytes.length);
    }
    if (service_tones_ready(this.#ptr) !== 0) {
      throw new Error("service_tones_ready failed");
    }
    this.#name = this.#readText(service_get_text_name);
    this.#comment = this.#readText(service_get_text_comment);
    const beatTempo = service_get_beat_tempo(this.#ptr);
    const beatNum = service_get_beat_num(this.#ptr);
    this.#secondsPerMeasure = (beatNum * 60) / beatTempo;
    this.#measureNum = service_get_measure_num(this.#ptr);
    this.#repeatMeasure = service_get_repeat_measure(this.#ptr);
    const lastMeasure = service_get_last_measure(this.#ptr);
    this.#lastMeasure = lastMeasure !== 0 ? lastMeasure : this.#measureNum;
    this.#currentFrame = 0;
    this.#units = this.#loadUnits();
    this.#events = this.#loadEvents();
    this.#state = "ready";
  }

  /**
   * Returns a `ReadableStream` that yields signed 16-bit interleaved PCM chunks
   * as {@link AudioData} objects (format `"s16"`).
   *
   * Only one stream may be active at a time. The stream ends naturally when the
   * song finishes (or the loop point is reached with `loop: false`).
   *
   * @throws {Error} If the instance has been disposed, {@link read} has not been called, or a stream is already active.
   */
  stream(
    {
      startTime = 0,
      unitMute = false,
      loop = false,
      numberOfFrames = 1024,
      highWaterMark = 1,
      signal,
    }: StreamOptions = {},
  ): ReadableStream<AudioData> {
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
    }
    if (this.#state === "idle") {
      throw new Error("read must be called before stream");
    }
    if (this.#state === "streaming") {
      throw new Error("stream is already active");
    }

    const channels = this.#channels!;
    const sampleRate = this.#sampleRate!;
    const chunkBytes = numberOfFrames * channels * 2;
    const startSample = Math.round(startTime * sampleRate);

    if (
      service_moo_preparation(
        this.#ptr,
        startSample,
        unitMute ? 1 : 0,
        loop ? 1 : 0,
      ) !== 0
    ) {
      return new ReadableStream({
        start(controller) {
          controller.error(new Error("service_moo_preparation failed"));
        },
      });
    }

    this.#state = "streaming";
    const isDisposed = () => this.#state === "disposed";
    const onStreamEnd = () => {
      if (this.#state === "disposed") {
        service_free(this.#ptr);
      } else {
        this.#state = "ready";
      }
    };
    const setCurrentFrame = (frame: number) => {
      this.#currentFrame = frame;
    };
    const ptr = this.#ptr;
    let currentFrame = startSample;

    return new ReadableStream<AudioData>({
      pull(controller) {
        try {
          signal?.throwIfAborted();
          if (isDisposed()) {
            onStreamEnd();
            controller.error(new Error("Pxtone instance has been disposed"));
            return;
          }
          if (service_is_end_vomit(ptr) !== 0) {
            onStreamEnd();
            controller.close();
            return;
          }
          const memPtr = alloc(chunkBytes);
          try {
            if (service_moo(ptr, memPtr, chunkBytes) === 0) {
              onStreamEnd();
              controller.close();
              return;
            }
            const audioData = new AudioData({
              format: "s16",
              sampleRate,
              numberOfFrames,
              numberOfChannels: channels,
              timestamp: Math.round(currentFrame * 1_000_000 / sampleRate),
              data: new Int16Array(
                memory.buffer,
                memPtr,
                chunkBytes / 2,
              ),
            });
            controller.enqueue(audioData);
            setCurrentFrame(currentFrame);
            currentFrame += numberOfFrames;
          } finally {
            dealloc(memPtr, chunkBytes);
          }
        } catch (e) {
          onStreamEnd();
          throw e;
        }
      },
      cancel() {
        onStreamEnd();
      },
    }, { highWaterMark });
  }

  /**
   * Toggles the {@link PxtoneUnit.played} flag of the unit at `index`.
   *
   * @param index - Index into {@link units}.
   * @param force - If provided, sets `played` to this value instead of toggling.
   * @throws {Error} If the instance has been disposed, or {@link read} has not been called.
   * @throws {RangeError} If `index` is out of bounds.
   */
  toggleUnitPlayed(index: number, force?: boolean): void {
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
    }
    if (this.#state === "idle") {
      throw new Error("read must be called before toggleUnitPlayed");
    }
    const unit = this.#units[index];
    if (unit === undefined) {
      throw new RangeError(`unit index ${index} is out of range`);
    }
    const newPlayed = force ?? !unit.played;
    service_set_unit_played(this.#ptr, index, newPlayed ? 1 : 0);
    setUnitPlayed(unit, newPlayed);
  }

  /**
   * Decodes a `.ptnoise` file and returns the rendered PCM as an `AudioBuffer`.
   *
   * @param buffer - Raw `.ptnoise` file bytes.
   * @returns A promise that resolves with the decoded `AudioBuffer` and its metadata.
   * @throws {Error} If the instance has been disposed.
   */
  decodeNoiseData(
    buffer: ArrayBuffer | Uint8Array,
  ): Promise<{ buffer: AudioBuffer; data: NoiseData }> {
    if (this.#state === "disposed") {
      return Promise.reject(new Error("Pxtone instance has been disposed"));
    }
    try {
      const { pcm, channels, sampleRate } = this.#renderNoise(buffer);
      return Promise.resolve({
        buffer: this.#pcmToAudioBuffer(pcm, channels, sampleRate),
        data: { channels, sampleRate },
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  #readText(fn: (svc: number, outLen: number) => number): string | null {
    const lenPtr = alloc(4);
    try {
      const ptr = fn(this.#ptr, lenPtr);
      if (ptr === 0) return null;
      const len = new Uint32Array(memory.buffer, lenPtr, 1)[0];
      return Pxtone.#sjisDecoder.decode(
        new Uint8Array(memory.buffer, ptr, len),
      );
    } finally {
      dealloc(lenPtr, 4);
    }
  }

  #loadUnits(): readonly PxtoneUnit[] {
    const count = service_get_unit_count(this.#ptr);
    const lenPtr = alloc(4);
    try {
      const units: PxtoneUnit[] = [];
      for (let i = 0; i < count; i++) {
        const namePtr = service_get_unit_name(this.#ptr, i, lenPtr);
        const nameLen = new Uint32Array(memory.buffer, lenPtr, 1)[0];
        const name = Pxtone.#sjisDecoder.decode(
          new Uint8Array(memory.buffer, namePtr, nameLen),
        );
        const played = service_get_unit_played(this.#ptr, i) !== 0;
        units.push(new PxtoneUnit(name, played));
      }
      return Object.freeze(units);
    } finally {
      dealloc(lenPtr, 4);
    }
  }

  #loadEvents(): readonly PxtoneEvent[] {
    const count = service_get_event_count(this.#ptr);
    const events: PxtoneEvent[] = [];
    for (let i = 0; i < count; i++) {
      events.push(
        new PxtoneEvent(
          service_get_event_clock(this.#ptr, i),
          service_get_event_unit_index(this.#ptr, i),
          service_get_event_kind(this.#ptr, i) as PxtoneEventKind,
          service_get_event_value(this.#ptr, i),
        ),
      );
    }
    return Object.freeze(events);
  }

  #renderNoise(
    data: ArrayBuffer | Uint8Array,
  ): { pcm: Uint8Array; channels: 1 | 2; sampleRate: number } {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const dataPtr = alloc(bytes.length);
    const outChannels = alloc(4);
    const outSampleRate = alloc(4);
    const outSamplesLen = alloc(4);
    try {
      new Uint8Array(memory.buffer, dataPtr, bytes.length).set(bytes);
      const samplesPtr = service_render_noise(
        this.#ptr,
        dataPtr,
        bytes.length,
        outChannels,
        outSampleRate,
        outSamplesLen,
      );
      if (samplesPtr === 0) throw new Error("service_render_noise failed");
      const channels = new Uint32Array(memory.buffer, outChannels, 1)[0] as
        | 1
        | 2;
      const sampleRate = new Uint32Array(memory.buffer, outSampleRate, 1)[0];
      const samplesLen = new Uint32Array(memory.buffer, outSamplesLen, 1)[0];
      const pcm = new Uint8Array(memory.buffer, samplesPtr, samplesLen).slice();
      dealloc(samplesPtr, samplesLen);
      return { pcm, channels, sampleRate };
    } finally {
      dealloc(dataPtr, bytes.length);
      dealloc(outChannels, 4);
      dealloc(outSampleRate, 4);
      dealloc(outSamplesLen, 4);
    }
  }

  #pcmToAudioBuffer(
    pcm: Uint8Array,
    channels: number,
    sampleRate: number,
  ): AudioBuffer {
    const totalSamples = pcm.length / (channels * 2);
    const audioBuffer = new AudioBuffer({
      numberOfChannels: channels,
      length: totalSamples,
      sampleRate,
    });
    const channelData: Float32Array<ArrayBuffer>[] = [];
    for (let i = 0; i < channels; ++i) {
      channelData.push(audioBuffer.getChannelData(i));
    }
    const int16 = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
    for (let i = 0; i < totalSamples; i++) {
      for (let ch = 0; ch < channels; ch++) {
        const s = int16[i * channels + ch];
        channelData[ch][i] = s / (s >= 0 ? 32767 : 32768);
      }
    }
    return audioBuffer;
  }
}
