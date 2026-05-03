import {
  alloc,
  dealloc,
  memory,
  service_free,
  service_get_beat_tempo,
  service_get_beats_per_measure,
  service_get_channels,
  service_get_event_count,
  service_get_event_kind,
  service_get_event_tick,
  service_get_event_unit_index,
  service_get_event_value,
  service_get_last_measure,
  service_get_measure_num,
  service_get_repeat_measure,
  service_get_sample_rate,
  service_get_text_comment,
  service_get_text_name,
  service_get_ticks_per_beat,
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
  static get KIND_NULL() {
    return 0 as const;
  }
  /** Note-on: begins a note. The `value` is the note length in ticks. */
  static get KIND_ON() {
    return 1 as const;
  }
  /** Key (pitch). The `value` is encoded as `(octave * 12 + semitone) * 256`. */
  static get KIND_KEY() {
    return 2 as const;
  }
  /** Pan (stereo position). `value` ranges from 0 (left) to 128 (center) to 256 (right). */
  static get KIND_PAN_VOLUME() {
    return 3 as const;
  }
  /** Velocity (attack strength). `value` ranges from 0 to 128. */
  static get KIND_VELOCITY() {
    return 4 as const;
  }
  /** Volume. `value` ranges from 0 to 128. */
  static get KIND_VOLUME() {
    return 5 as const;
  }
  /** Portamento (pitch glide). `value` is the portamento length in ticks. */
  static get KIND_PORTAMENT() {
    return 6 as const;
  }
  /** Ticks per beat. */
  static get KIND_TICKS_PER_BEAT() {
    return 7 as const;
  }
  /** Beat tempo in BPM (floating-point encoded as `Math.round(bpm * 100)`). */
  static get KIND_BEAT_TEMPO() {
    return 8 as const;
  }
  /** Beats per measure. */
  static get KIND_BEATS_PER_MEASURE() {
    return 9 as const;
  }
  /** Repeat: marks the loop start measure. */
  static get KIND_REPEAT() {
    return 10 as const;
  }
  /** Last: marks the loop end measure. */
  static get KIND_LAST() {
    return 11 as const;
  }
  /** Voice number: selects which instrument voice to use. */
  static get KIND_VOICE_NO() {
    return 12 as const;
  }
  /** Group number: assigns the unit to a group. */
  static get KIND_GROUP_NO() {
    return 13 as const;
  }
  /** Tuning offset in semitones (floating-point encoded as `Math.round(semitones * 100)`). */
  static get KIND_TUNING() {
    return 14 as const;
  }
  /** Time-based pan (auto-pan). `value` is the pan sweep period in ticks. */
  static get KIND_PAN_TIME() {
    return 15 as const;
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

  #name: string | null = null;
  #comment: string | null = null;

  #ticksPerBeat: number | null = null;
  #beatsPerMeasure: number | null = null;
  #beatTempo: number | null = null;
  #measureCount: number | null = null;
  #secondsPerMeasure: number | null = null;

  #loopStartMeasure: number | null = null;
  #loopEndMeasure: number | null = null;

  #state: "idle" | "ready" | "streaming" | "disposed" = "idle";
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
    this.#release();
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
  get measureCount(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#measureCount!;
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
  get tickCount(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#measureCount! * this.#beatsPerMeasure! * this.#ticksPerBeat!;
  }

  /** Total song duration in seconds. `null` before {@link read}. */
  get duration(): number | null {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return null;
    }
    return this.#measureCount! * this.#secondsPerMeasure!;
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
    this.#release();
  }

  #release() {
    this.#name = null;
    this.#comment = null;
    this.#ticksPerBeat = null;
    this.#beatsPerMeasure = null;
    this.#beatTempo = null;
    this.#secondsPerMeasure = null;
    this.#measureCount = null;
    this.#loopStartMeasure = null;
    this.#loopEndMeasure = null;
    this.#currentFrame = 0;
    for (let i = 0; i < this.#units.length; ++i) {
      releaseUnitPtr(this.#units[i]);
    }
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
    this.#ticksPerBeat = service_get_ticks_per_beat(this.#ptr);
    this.#beatsPerMeasure = service_get_beats_per_measure(this.#ptr);
    this.#beatTempo = service_get_beat_tempo(this.#ptr);
    this.#secondsPerMeasure = (this.#beatsPerMeasure * 60) / this.#beatTempo;
    this.#measureCount = service_get_measure_num(this.#ptr);
    this.#loopStartMeasure = service_get_repeat_measure(this.#ptr);
    const loopEndMeasure = service_get_last_measure(this.#ptr);
    this.#loopEndMeasure = loopEndMeasure !== 0 ? loopEndMeasure : this.#measureCount;
    this.#currentFrame = 0;
    this.#units = this.#loadUnits();
    this.#events = this.#loadEvents(this.#units);
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
    if (this.#state === "idle") {
      throw new Error("read must be called before stream");
    }
    if (this.#state === "streaming") {
      throw new Error("stream is already active");
    }
    if (this.#state === "disposed") {
      throw new Error("Pxtone instance has been disposed");
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
   * Decodes a `.ptnoise` file and returns the rendered PCM as an `AudioBuffer`.
   *
   * @param buffer - Raw `.ptnoise` file bytes.
   * @returns A promise that resolves with the decoded `AudioBuffer`.
   * @throws {Error} If the instance has been disposed.
   */
  decodeNoiseData(
    buffer: ArrayBuffer | Uint8Array,
  ): Promise<AudioBuffer> {
    if (this.#state === "disposed") {
      return Promise.reject(new Error("Pxtone instance has been disposed"));
    }
    try {
      const { pcm, channels, sampleRate } = this.#renderNoise(buffer);
      return Promise.resolve(this.#pcmToAudioBuffer(pcm, channels, sampleRate));
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
    } finally {
      dealloc(lenPtr, 4);
    }
  }

  #loadEvents(units: readonly PxtoneUnit[]): readonly PxtoneEvent[] {
    const count = service_get_event_count(this.#ptr);
    const events: PxtoneEvent[] = [];
    for (let i = 0; i < count; i++) {
      events.push(
        // @ts-expect-error: allow private constructor
        new PxtoneEvent(
          illegalConstructorKey,
          service_get_event_tick(this.#ptr, i),
          units[service_get_event_unit_index(this.#ptr, i)],
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
    const outSamplesLen = alloc(4);
    try {
      new Uint8Array(memory.buffer, dataPtr, bytes.length).set(bytes);
      const samplesPtr = service_render_noise(
        this.#ptr,
        dataPtr,
        bytes.length,
        outSamplesLen,
      );
      if (samplesPtr === 0) throw new Error("service_render_noise failed");
      const samplesLen = new Uint32Array(memory.buffer, outSamplesLen, 1)[0];
      const pcm = new Uint8Array(memory.buffer, samplesPtr, samplesLen).slice();
      dealloc(samplesPtr, samplesLen);
      return { pcm, channels: this.#channels, sampleRate: this.#sampleRate };
    } finally {
      dealloc(dataPtr, bytes.length);
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
