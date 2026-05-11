import { pcmToAudioData } from "./pcm.ts";

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
  service_set_unit_played,
  service_tones_ready,
  validate,
  validate_noise,
} from "./pxtone.wasm";

const illegalConstructorKey: unique symbol = Symbol("illegalConstructorKey");

let releaseUnitPtr!: (unit: PxtoneUnit) => void;

/** A single instrument track in a pxtone song. */
export class PxtoneUnit {
  #ptr: number | null;
  readonly #name: string;
  #played: boolean;
  readonly #index: number;

  private constructor(
    key: typeof illegalConstructorKey,
    ptr: number,
    name: string,
    played: boolean,
    index: number,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#name = name;
    this.#played = played;
    this.#index = index;
    this.#ptr = ptr;
  }

  static {
    releaseUnitPtr = (unit) => {
      unit.#ptr = null;
    };
  }

  /** Display name of this unit. */
  get name(): string {
    return this.#name;
  }

  /**
   * Whether this unit is active (not muted).
   * Can be toggled via {@link togglePlayed}.
   */
  get played(): boolean {
    return this.#played;
  }

  /**
   * Toggles the {@link played} flag of the unit.
   *
   * @param force - If provided, sets `played` to this value instead of toggling.
   */
  togglePlayed(force?: boolean | undefined) {
    const newPlayed = force ?? !this.#played;
    this.#played = newPlayed;
    if (this.#ptr !== null) {
      service_set_unit_played(this.#ptr, this.#index, newPlayed ? 1 : 0);
    }
  }

  toJSON(): { name: string; played: boolean } {
    return {
      name: this.#name,
      played: this.#played,
    };
  }
}

/** Union of all valid {@link PxtoneEvent} kind values. */
export type PxtoneEventKind =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

/** A single automation event in a pxtone song's event list. */
export class PxtoneEvent {
  /** No event / padding. */
  static get KIND_NULL(): 0 {
    return 0;
  }
  /** Note-on: begins a note. The `value` is the note length in ticks. */
  static get KIND_ON(): 1 {
    return 1;
  }
  /** Key (pitch). The `value` is encoded as `(octave * 12 + semitone) * 256`. */
  static get KIND_KEY(): 2 {
    return 2;
  }
  /** Pan (stereo position). `value` ranges from 0 (left) to 128 (center) to 256 (right). */
  static get KIND_PAN_VOLUME(): 3 {
    return 3;
  }
  /** Velocity (attack strength). `value` ranges from 0 to 128. */
  static get KIND_VELOCITY(): 4 {
    return 4;
  }
  /** Volume. `value` ranges from 0 to 128. */
  static get KIND_VOLUME(): 5 {
    return 5;
  }
  /** Portamento (pitch glide). `value` is the portamento length in ticks. */
  static get KIND_PORTAMENT(): 6 {
    return 6;
  }
  /** Ticks per beat. */
  static get KIND_TICKS_PER_BEAT(): 7 {
    return 7;
  }
  /** Beat tempo in BPM (floating-point encoded as `Math.round(bpm * 100)`). */
  static get KIND_BEAT_TEMPO(): 8 {
    return 8;
  }
  /** Beats per measure. */
  static get KIND_BEATS_PER_MEASURE(): 9 {
    return 9;
  }
  /** Repeat: marks the loop start measure. */
  static get KIND_REPEAT(): 10 {
    return 10;
  }
  /** Last: marks the loop end measure. */
  static get KIND_LAST(): 11 {
    return 11;
  }
  /** Voice number: selects which instrument voice to use. */
  static get KIND_VOICE_NO(): 12 {
    return 12;
  }
  /** Group number: assigns the unit to a group. */
  static get KIND_GROUP_NO(): 13 {
    return 13;
  }
  /** Tuning offset in semitones (floating-point encoded as `Math.round(semitones * 100)`). */
  static get KIND_TUNING(): 14 {
    return 14;
  }
  /** Time-based pan (auto-pan). `value` is the pan sweep period in ticks. */
  static get KIND_PAN_TIME(): 15 {
    return 15;
  }

  readonly #tick: number;
  readonly #unit: PxtoneUnit;
  readonly #kind: PxtoneEventKind;
  readonly #value: number;

  private constructor(
    key: typeof illegalConstructorKey,
    tick: number,
    unit: PxtoneUnit,
    kind: PxtoneEventKind,
    value: number,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#tick = tick;
    this.#unit = unit;
    this.#kind = kind;
    this.#value = value;
  }

  /** Tick position at which this event fires. */
  get tick(): number {
    return this.#tick;
  }

  /** Index into {@link Pxtone.units} that this event targets. */
  get unit(): PxtoneUnit {
    return this.#unit;
  }

  /** What this event controls. See the `EVENT_KIND_*` constants. */
  get kind(): PxtoneEventKind {
    return this.#kind;
  }

  /** The event's payload. Interpretation depends on {@link kind}. */
  get value(): number {
    return this.#value;
  }

  toJSON(): { tick: number; unit: PxtoneUnit; kind: PxtoneEventKind; value: number } {
    return {
      tick: this.#tick,
      unit: this.#unit,
      kind: this.#kind,
      value: this.#value,
    };
  }
}

/** Options for {@link Pxtone}. */
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

/** Options for {@link Pxtone.stream}. */
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
  #numberOfChannels: 1 | 2;
  #sampleRate: number;

  #name: string | null = null;
  #comment: string | null = null;

  #ticksPerBeat: number | null = null;
  #beatsPerMeasure: number | null = null;
  #beatTempo: number | null = null;
  #numberOfMeasures: number | null = null;
  #secondsPerMeasure: number | null = null;

  #loopStartMeasure: number | null = null;
  #loopEndMeasure: number | null = null;

  #state: "idle" | "ready" | "streaming" | "disposed" = "idle";
  #currentFrame = 0;

  #units: readonly PxtoneUnit[] | null = null;
  #events: readonly PxtoneEvent[] | null = null;

  /**
   * Returns `true` if `buffer` is a valid `.ptcop` / `.pttune` file, `false` otherwise.
   * Does not create a persistent service instance.
   */
  static validate(buffer: ArrayBuffer | Uint8Array): boolean {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const ptr = alloc(bytes.length);
    try {
      new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
      return validate(ptr, bytes.length) === 0;
    } finally {
      dealloc(ptr, bytes.length);
    }
  }

  /**
   * Returns `true` if `buffer` is a valid `.ptnoise` file, `false` otherwise.
   * Does not create a persistent service instance.
   */
  static validateNoiseData(buffer: ArrayBuffer | Uint8Array): boolean {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const ptr = alloc(bytes.length);
    try {
      new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
      return validate_noise(ptr, bytes.length) === 0;
    } finally {
      dealloc(ptr, bytes.length);
    }
  }

  constructor(
    { numberOfChannels = 2, sampleRate = 44100 }: PxtoneOptions = {},
  ) {
    if (numberOfChannels !== 1 && numberOfChannels !== 2) {
      throw new RangeError(
        `numberOfChannels must be 1 or 2, got ${numberOfChannels}`,
      );
    }
    this.#ptr = service_new(numberOfChannels, sampleRate);
    this.#numberOfChannels = numberOfChannels;
    this.#sampleRate = sampleRate;
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
    this.#release();
    Pxtone.#registry.unregister(this);
    if (!wasStreaming) {
      service_free(this.#ptr);
    }
  }

  /** Number of output channels. */
  get numberOfChannels(): 1 | 2 {
    return this.#numberOfChannels;
  }

  /** Output sample rate in Hz. */
  get sampleRate(): number {
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

  /** Ticks per beat. `null` before {@link read}. */
  get ticksPerBeat(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#ticksPerBeat!;
  }

  /** Beats per measure. `null` before {@link read}. */
  get beatsPerMeasure(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#beatsPerMeasure!;
  }

  /** Tempo in beats per minute. `null` before {@link read}. */
  get beatTempo(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#beatTempo!;
  }

  /** Total number of measures in the song. `null` before {@link read}. */
  get numberOfMeasures(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#numberOfMeasures!;
  }

  /** Loop start position in measures. `null` before {@link read}. */
  get loopStartMeasure(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#loopStartMeasure!;
  }

  /** Loop end position in measures. `null` before {@link read}. */
  get loopEndMeasure(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#loopEndMeasure!;
  }

  /** Total length of the song in ticks. `null` before {@link read}. */
  get numberOfTicks(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#numberOfMeasures! * this.#beatsPerMeasure! * this.#ticksPerBeat!;
  }

  /** Total song duration in seconds. `null` before {@link read}. */
  get duration(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#numberOfMeasures! * this.#secondsPerMeasure!;
  }

  /** Loop start position in seconds. `null` before {@link read}. */
  get loopStart(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#loopStartMeasure! * this.#secondsPerMeasure!;
  }

  /** Loop end position in seconds. `null` before {@link read}. */
  get loopEnd(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#loopEndMeasure! * this.#secondsPerMeasure!;
  }

  /** Current playback position in ticks, updated as each chunk is pulled from the stream. */
  get currentTick(): number {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return 0;
    }
    const spm = this.#secondsPerMeasure!;
    const tpm = this.#beatsPerMeasure! * this.#ticksPerBeat!;
    return Math.round(this.#resolveCurrentFrame() * tpm / (spm * this.#sampleRate));
  }

  /** Current playback position in seconds, updated as each chunk is pulled from the stream. */
  get currentTime(): number {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return 0;
    }
    return this.#resolveCurrentFrame() / this.#sampleRate;
  }

  #resolveCurrentFrame(): number {
    const sampleRate = this.#sampleRate;
    const currentFrame = this.#currentFrame;
    const loopEndMeasure = this.#loopEndMeasure!;
    const loopStartMeasure = this.#loopStartMeasure!;
    if (loopStartMeasure !== 0) {
      const spm = this.#secondsPerMeasure!;
      const loopEndFrame = Math.round(loopEndMeasure * spm * sampleRate);
      const loopStartFrame = Math.round(loopStartMeasure * spm * sampleRate);
      const loopLength = Math.round(
        (loopEndMeasure - loopStartMeasure) * spm * sampleRate,
      );
      if (loopLength > 0 && currentFrame > loopEndFrame) {
        return loopStartFrame + (currentFrame - loopEndFrame) % loopLength;
      }
    }
    return currentFrame;
  }

  /** Ordered list of instrument tracks in the loaded song. */
  get units(): readonly PxtoneUnit[] {
    if (this.#units !== null) {
      return this.#units;
    }
    if (this.#state === "idle" || this.#state === "disposed") {
      this.#events = Object.freeze([]);
      this.#units = Object.freeze([]);
    } else {
      this.#units = this.#loadUnits();
      this.#events = this.#loadEvents(this.#units);
    }
    return this.#units;
  }

  /** Ordered list of automation events in the loaded song. */
  get events(): readonly PxtoneEvent[] {
    if (this.#events !== null) {
      return this.#events;
    }
    if (this.#state === "idle" || this.#state === "disposed") {
      this.#units = Object.freeze([]);
      this.#events = Object.freeze([]);
    } else {
      this.#units = this.#loadUnits();
      this.#events = this.#loadEvents(this.#units);
    }
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
    this.#release();
  }

  #release() {
    this.#name = null;
    this.#comment = null;
    this.#ticksPerBeat = null;
    this.#beatsPerMeasure = null;
    this.#beatTempo = null;
    this.#secondsPerMeasure = null;
    this.#numberOfMeasures = null;
    this.#loopStartMeasure = null;
    this.#loopEndMeasure = null;
    this.#currentFrame = 0;
    if (this.#units !== null) {
      for (let i = 0; i < this.#units.length; ++i) {
        releaseUnitPtr(this.#units[i]);
      }
    }
    this.#units = null;
    this.#events = null;
  }

  /**
   * Loads a `.ptcop` or `.pttune` file and prepares it for playback.
   * Populates {@link name}, {@link comment}, {@link ticksPerBeat}, {@link beatsPerMeasure},
   * {@link beatTempo}, {@link numberOfMeasures}, {@link loopStartMeasure}, {@link loopEndMeasure},
   * {@link numberOfTicks}, {@link duration}, {@link loopStart}, {@link loopEnd},
   * and enables lazy access to {@link units} and {@link events}.
   *
   * @param buffer - Raw file bytes.
   * @throws {Error} If the instance has been disposed, called while a stream is active, or the file is invalid.
   */
  read(buffer: ArrayBuffer | Uint8Array): void {
    if (this.#state === "streaming") {
      throw new Error("cannot call read while streaming");
    }
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
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
    // Deno-generated Wasm types do not support Multi-Value returns.
    const {
      0: ticksPerBeat,
      1: beatsPerMeasure,
      2: beatTempo,
      3: measureCount,
      4: repeatMeasure,
      5: lastMeasure,
    } = service_get_master(this.#ptr) as unknown as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    this.#ticksPerBeat = ticksPerBeat;
    this.#beatsPerMeasure = beatsPerMeasure;
    this.#beatTempo = beatTempo;
    this.#secondsPerMeasure = (beatsPerMeasure * 60) / beatTempo;
    this.#numberOfMeasures = measureCount;
    this.#loopStartMeasure = repeatMeasure;
    this.#loopEndMeasure = lastMeasure !== 0 ? lastMeasure : measureCount;
    this.#currentFrame = 0;
    this.#units = null;
    this.#events = null;
    this.#state = "ready";
  }

  /**
   * Returns a `ReadableStream` that yields PCM chunks as {@link AudioData} objects
   * (format `"f32-planar"`).
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
    if (this.#state === "idle") {
      throw new Error("read must be called before stream");
    }
    if (this.#state === "streaming") {
      throw new Error("stream is already active");
    }
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
    }

    const channels = this.#numberOfChannels!;
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
      throw new Error("service_moo_preparation failed");
    }

    this.#state = "streaming";
    const bufPtr = alloc(chunkBytes);
    const isDisposed = () => this.#state === "disposed";
    let streamEnded = false;
    const onStreamEnd = () => {
      if (streamEnded) return;
      streamEnded = true;
      dealloc(bufPtr, chunkBytes);
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

    let abortHandler: (() => void) | undefined;
    const cleanupAbort = () => {
      if (signal && abortHandler !== undefined) {
        signal.removeEventListener("abort", abortHandler);
        abortHandler = undefined;
      }
    };

    return new ReadableStream<AudioData>({
      start(controller) {
        if (signal == null) return;
        if (signal.aborted) {
          onStreamEnd();
          controller.error(signal.reason);
          return;
        }
        abortHandler = () => {
          cleanupAbort();
          onStreamEnd();
          controller.error(signal.reason);
        };
        signal.addEventListener("abort", abortHandler);
      },
      pull(controller) {
        try {
          if (isDisposed()) {
            cleanupAbort();
            onStreamEnd();
            controller.error(new Error("Pxtone instance has been disposed"));
            return;
          }
          // Deno-generated Wasm types do not support Multi-Value returns.
          const { 1: written } = service_moo(ptr, bufPtr, chunkBytes) as unknown as [
            number,
            number,
          ];
          const writtenBytes = written >>> 0;
          if (writtenBytes === 0) {
            cleanupAbort();
            onStreamEnd();
            controller.close();
            return;
          }
          const writtenFrames = writtenBytes / (channels * 2);
          const audioData = pcmToAudioData({
            data: new Int16Array(memory.buffer, bufPtr, writtenBytes / 2),
            sampleRate,
            numberOfFrames: writtenFrames,
            numberOfChannels: channels,
            timestamp: Math.round(currentFrame * 1_000_000 / sampleRate),
          });
          controller.enqueue(audioData);
          setCurrentFrame(currentFrame);
          currentFrame += writtenFrames;
        } catch (e) {
          cleanupAbort();
          onStreamEnd();
          throw e;
        }
      },
      cancel() {
        cleanupAbort();
        onStreamEnd();
      },
    }, { highWaterMark });
  }

  /**
   * Decodes a `.ptnoise` file and returns the rendered PCM as an `AudioBuffer`.
   *
   * @param buffer - Raw `.ptnoise` file bytes.
   * @returns A promise that resolves with the decoded `AudioData`.
   * @throws {Error} If the instance has been disposed.
   */
  decodeNoiseData(
    buffer: ArrayBuffer | Uint8Array,
  ): Promise<AudioData> {
    if (this.#state === "disposed") {
      return Promise.reject(new Error("Pxtone instance has been disposed"));
    }
    try {
      const { pcm, channels, sampleRate } = this.#renderNoise(buffer);
      const numberOfFrames = pcm.length / (channels * 2);
      return Promise.resolve(
        pcmToAudioData({
          data: new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2),
          sampleRate,
          numberOfFrames,
          numberOfChannels: channels,
          timestamp: 0,
        }),
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  #readText(fn: (svc: number) => unknown): string | null {
    // Deno-generated Wasm types do not support Multi-Value returns.
    const { 0: ptr, 1: len } = fn(this.#ptr) as unknown as [number, number];
    if (!ptr) return null;
    return Pxtone.#sjisDecoder.decode(new Uint8Array(memory.buffer, ptr >>> 0, len >>> 0));
  }

  #loadUnits(): readonly PxtoneUnit[] {
    const count = service_get_unit_count(this.#ptr);
    const units: PxtoneUnit[] = [];
    for (let i = 0; i < count; i++) {
      // Deno-generated Wasm types do not support Multi-Value returns.
      const { 0: namePtr, 1: nameLen } = service_get_unit_name(this.#ptr, i) as unknown as [
        number,
        number,
      ];
      const name = Pxtone.#sjisDecoder.decode(
        new Uint8Array(memory.buffer, namePtr >>> 0, nameLen >>> 0),
      );
      const played = service_get_unit_played(this.#ptr, i) !== 0;
      units.push(
        // @ts-expect-error: allow private constructor
        new PxtoneUnit(
          illegalConstructorKey,
          this.#ptr,
          name,
          played,
          i,
        ),
      );
    }
    return Object.freeze(units);
  }

  #loadEvents(units: readonly PxtoneUnit[]): readonly PxtoneEvent[] {
    const count = service_get_event_count(this.#ptr);
    const events: PxtoneEvent[] = [];
    for (let i = 0; i < count; i++) {
      // Deno-generated Wasm types do not support Multi-Value returns.
      const { 0: tick, 1: unitNo, 2: kind, 3: value } = service_get_event(
        this.#ptr,
        i,
      ) as unknown as [number, number, number, number];
      events.push(
        // @ts-expect-error: allow private constructor
        new PxtoneEvent(
          illegalConstructorKey,
          tick,
          units[unitNo],
          kind as PxtoneEventKind,
          value,
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
    try {
      new Uint8Array(memory.buffer, dataPtr, bytes.length).set(bytes);
      // Deno-generated Wasm types do not support Multi-Value returns.
      const { 0: samplesPtr, 1: samplesLen } = service_render_noise(
        this.#ptr,
        dataPtr,
        bytes.length,
      ) as unknown as [number, number];
      if (!samplesPtr) throw new Error("service_render_noise failed");
      const pcm = new Uint8Array(memory.buffer, samplesPtr >>> 0, samplesLen >>> 0).slice();
      dealloc(samplesPtr >>> 0, samplesLen >>> 0);
      return { pcm, channels: this.#numberOfChannels, sampleRate: this.#sampleRate };
    } finally {
      dealloc(dataPtr, bytes.length);
    }
  }
}
