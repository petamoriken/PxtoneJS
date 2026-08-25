/**
 * @license MIT
 * PxtoneJS v4.2.4
 * Copyright (c) 2016-2026 Kenta Moriuchi <moriken@kimamass.com> (https://moriken.dev)
 *
 * This library includes third-party software under the following licenses:
 * - ogg (3-Clause BSD): Copyright (c) 2016-2017 est31 and contributors, 2002-2015 Xiph.org Foundation
 * - lewton (MIT or Apache-2.0): Copyright (c) 2016 est31 and contributors
 * - tinyvec (Zlib or MIT or Apache-2.0): Copyright (c) 2019 Daniel "Lokathor" Gee
 * - talc (MIT): Copyright (c) 2026 Shaun Beautement
 *
 * Play Pxtone Collage ["pxtone"](https://pxtone.org/) files in the browser.
 * @module Pxtone
 */

import { pcmToAudioData } from "./pcm.ts";
import { buildNotes } from "./notes.ts";

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

/** Options for {@link PxtoneError}. */
export interface PxtoneErrorOptions extends ErrorOptions {
  code?: string;
}

/** Error thrown by {@link Pxtone} methods on operation failures. */
export class PxtoneError extends Error {
  declare code?: string;

  static {
    PxtoneError.prototype.name = "PxtoneError";
  }

  /** The instance has already been disposed. */
  static get CODE_DISPOSED(): "DISPOSED" {
    return "DISPOSED";
  }
  /** Operation not allowed while an audio stream is active. */
  static get CODE_STREAMING_ACTIVE(): "STREAMING_ACTIVE" {
    return "STREAMING_ACTIVE";
  }
  /** {@link Pxtone.read} has not been called yet. */
  static get CODE_NOT_READY(): "NOT_READY" {
    return "NOT_READY";
  }
  /** Failed to load the pxtone data. */
  static get CODE_READ_FAILED(): "READ_FAILED" {
    return "READ_FAILED";
  }
  /** Failed to initialize audio tones. */
  static get CODE_TONES_READY_FAILED(): "TONES_READY_FAILED" {
    return "TONES_READY_FAILED";
  }
  /** Failed to prepare audio playback. */
  static get CODE_PLAYBACK_PREPARATION_FAILED(): "PLAYBACK_PREPARATION_FAILED" {
    return "PLAYBACK_PREPARATION_FAILED";
  }
  /** Failed to render noise data. */
  static get CODE_RENDER_NOISE_FAILED(): "RENDER_NOISE_FAILED" {
    return "RENDER_NOISE_FAILED";
  }

  constructor(message?: string, options?: PxtoneErrorOptions) {
    super(message, options);
    if (options?.code !== undefined) {
      Object.defineProperty(this, "code", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: options.code,
      });
    }
  }
}

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

  /** Position of this unit in {@link Pxtone.units}. */
  get index(): number {
    return this.#index;
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
   * @example
   * ```ts
   * unit.togglePlayed(); // toggle
   * unit.togglePlayed(false); // mute
   * ```
   */
  togglePlayed(force?: boolean | undefined) {
    const newPlayed = force ?? !this.#played;
    this.#played = newPlayed;
    if (this.#ptr !== null) {
      service_set_unit_played(this.#ptr, this.#index, newPlayed ? 1 : 0);
    }
  }

  toJSON(): { index: number; name: string; played: boolean } {
    return {
      index: this.#index,
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

const PXTONE_EVENT_PRIORITY = [
  0,
  50,
  40,
  60,
  70,
  80,
  30,
  0,
  0,
  0,
  0,
  255,
  10,
  20,
  90,
  100,
];

function pxtoneEventPriority(kind: PxtoneEventKind): number {
  return PXTONE_EVENT_PRIORITY[kind];
}

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
  /** Pan (stereo position). `value` ranges from 0 (left) to 64 (center) to 128 (right). */
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

  /** Unit this event targets. */
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

/** Interpolation used by a {@link PxtonePitchSegment}. */
export type PxtonePitchInterpolation = "hold" | "linear";

interface NoteTiming {
  readonly secondsPerTick: number;
}

/** A constant or linearly changing pitch interval within a {@link PxtoneNote}. */
export class PxtonePitchSegment {
  readonly #startTick: number;
  readonly #endTick: number;
  readonly #startKey: number;
  readonly #endKey: number;
  readonly #targetKey: number;
  readonly #interpolation: PxtonePitchInterpolation;
  readonly #timing: NoteTiming;

  private constructor(
    key: typeof illegalConstructorKey,
    startTick: number,
    endTick: number,
    startKey: number,
    endKey: number,
    targetKey: number,
    interpolation: PxtonePitchInterpolation,
    timing: NoteTiming,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#startTick = startTick;
    this.#endTick = endTick;
    this.#startKey = startKey;
    this.#endKey = endKey;
    this.#targetKey = targetKey;
    this.#interpolation = interpolation;
    this.#timing = timing;
  }

  get startTick(): number {
    return this.#startTick;
  }

  get endTick(): number {
    return this.#endTick;
  }

  get startTime(): number {
    return this.#startTick * this.#timing.secondsPerTick;
  }

  get endTime(): number {
    return this.#endTick * this.#timing.secondsPerTick;
  }

  /** Start pitch in native pxtone key units (256 per semitone). */
  get startKey(): number {
    return this.#startKey;
  }

  /** End pitch in native pxtone key units (256 per semitone). */
  get endKey(): number {
    return this.#endKey;
  }

  /**
   * Pitch this segment is heading for, in native pxtone key units (256 per semitone).
   *
   * Equal to {@link endKey} except when the note ends, or another key event arrives,
   * before the portamento completes; then {@link endKey} is the interpolated pitch
   * reached so far while this stays the key that was written. Renderers that snap a
   * note to a single key row want this; renderers that draw the glide want {@link endKey}.
   */
  get targetKey(): number {
    return this.#targetKey;
  }

  /** Start pitch in semitones. */
  get startPitch(): number {
    return this.#startKey / 256;
  }

  /** End pitch in semitones. */
  get endPitch(): number {
    return this.#endKey / 256;
  }

  /** {@link targetKey} in semitones. */
  get targetPitch(): number {
    return this.#targetKey / 256;
  }

  get interpolation(): PxtonePitchInterpolation {
    return this.#interpolation;
  }

  toJSON(): {
    startTick: number;
    endTick: number;
    startTime: number;
    endTime: number;
    startKey: number;
    endKey: number;
    targetKey: number;
    startPitch: number;
    endPitch: number;
    targetPitch: number;
    interpolation: PxtonePitchInterpolation;
  } {
    return {
      startTick: this.#startTick,
      endTick: this.#endTick,
      startTime: this.startTime,
      endTime: this.endTime,
      startKey: this.#startKey,
      endKey: this.#endKey,
      targetKey: this.#targetKey,
      startPitch: this.startPitch,
      endPitch: this.endPitch,
      targetPitch: this.targetPitch,
      interpolation: this.#interpolation,
    };
  }
}

/** A constant volume interval within a {@link PxtoneNote}. */
export class PxtoneVolumeSegment {
  readonly #startTick: number;
  readonly #endTick: number;
  readonly #value: number;
  readonly #timing: NoteTiming;

  private constructor(
    key: typeof illegalConstructorKey,
    startTick: number,
    endTick: number,
    value: number,
    timing: NoteTiming,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#startTick = startTick;
    this.#endTick = endTick;
    this.#value = value;
    this.#timing = timing;
  }

  get startTick(): number {
    return this.#startTick;
  }

  get endTick(): number {
    return this.#endTick;
  }

  get startTime(): number {
    return this.#startTick * this.#timing.secondsPerTick;
  }

  get endTime(): number {
    return this.#endTick * this.#timing.secondsPerTick;
  }

  get value(): number {
    return this.#value;
  }

  /** Volume as a gain multiplier, where the usual pxtone range 0–128 maps to 0–1. */
  get gain(): number {
    return this.#value / 128;
  }

  toJSON(): {
    startTick: number;
    endTick: number;
    startTime: number;
    endTime: number;
    value: number;
    gain: number;
  } {
    return {
      startTick: this.#startTick,
      endTick: this.#endTick,
      startTime: this.startTime,
      endTime: this.endTime,
      value: this.#value,
      gain: this.gain,
    };
  }
}

/** A constant stereo-pan interval within a {@link PxtoneNote}. */
export class PxtonePanVolumeSegment {
  readonly #startTick: number;
  readonly #endTick: number;
  readonly #value: number;
  readonly #timing: NoteTiming;

  private constructor(
    key: typeof illegalConstructorKey,
    startTick: number,
    endTick: number,
    value: number,
    timing: NoteTiming,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#startTick = startTick;
    this.#endTick = endTick;
    this.#value = value;
    this.#timing = timing;
  }

  get startTick(): number {
    return this.#startTick;
  }

  get endTick(): number {
    return this.#endTick;
  }

  get startTime(): number {
    return this.#startTick * this.#timing.secondsPerTick;
  }

  get endTime(): number {
    return this.#endTick * this.#timing.secondsPerTick;
  }

  get value(): number {
    return this.#value;
  }

  /** Pan position, where the usual pxtone range 0–64–128 maps to left −1–0–right +1. */
  get pan(): number {
    return (this.#value - 64) / 64;
  }

  toJSON(): {
    startTick: number;
    endTick: number;
    startTime: number;
    endTime: number;
    value: number;
    pan: number;
  } {
    return {
      startTick: this.#startTick,
      endTick: this.#endTick,
      startTime: this.startTime,
      endTime: this.endTime,
      value: this.#value,
      pan: this.pan,
    };
  }
}

/**
 * A note-on interval and its pitch movement over time.
 *
 * Notes belonging to the same unit never overlap: if the next note-on arrives before the
 * current note is over, the current note is cut short at that tick. Malformed files — songs
 * converted from other formats, for instance — rely on this.
 */
export class PxtoneNote {
  readonly #unit: PxtoneUnit;
  readonly #startTick: number;
  readonly #endTick: number;
  readonly #velocity: number;
  readonly #pitchSegments: readonly PxtonePitchSegment[];
  readonly #volumeSegments: readonly PxtoneVolumeSegment[];
  readonly #panVolumeSegments: readonly PxtonePanVolumeSegment[];
  readonly #timing: NoteTiming;

  private constructor(
    key: typeof illegalConstructorKey,
    unit: PxtoneUnit,
    startTick: number,
    endTick: number,
    velocity: number,
    pitchSegments: readonly PxtonePitchSegment[],
    volumeSegments: readonly PxtoneVolumeSegment[],
    panVolumeSegments: readonly PxtonePanVolumeSegment[],
    timing: NoteTiming,
  ) {
    if (key !== illegalConstructorKey) {
      throw new TypeError("Illegal constructor");
    }
    this.#unit = unit;
    this.#startTick = startTick;
    this.#endTick = endTick;
    this.#velocity = velocity;
    this.#pitchSegments = pitchSegments;
    this.#volumeSegments = volumeSegments;
    this.#panVolumeSegments = panVolumeSegments;
    this.#timing = timing;
  }

  get unit(): PxtoneUnit {
    return this.#unit;
  }

  get startTick(): number {
    return this.#startTick;
  }

  get endTick(): number {
    return this.#endTick;
  }

  get startTime(): number {
    return this.#startTick * this.#timing.secondsPerTick;
  }

  get endTime(): number {
    return this.#endTick * this.#timing.secondsPerTick;
  }

  get velocity(): number {
    return this.#velocity;
  }

  /**
   * Pitch movement over the note, in chronological order. Always holds at least one segment,
   * and the segments cover the note from {@link startTick} to {@link endTick} without gaps or
   * overlaps.
   */
  get pitchSegments(): readonly PxtonePitchSegment[] {
    return this.#pitchSegments;
  }

  /** Volume over the note, in chronological, gap-free constant-value segments. */
  get volumeSegments(): readonly PxtoneVolumeSegment[] {
    return this.#volumeSegments;
  }

  /** Stereo pan over the note, in chronological, gap-free constant-value segments. */
  get panVolumeSegments(): readonly PxtonePanVolumeSegment[] {
    return this.#panVolumeSegments;
  }

  toJSON(): {
    unit: PxtoneUnit;
    startTick: number;
    endTick: number;
    startTime: number;
    endTime: number;
    velocity: number;
    pitchSegments: readonly PxtonePitchSegment[];
    volumeSegments: readonly PxtoneVolumeSegment[];
    panVolumeSegments: readonly PxtonePanVolumeSegment[];
  } {
    return {
      unit: this.#unit,
      startTick: this.#startTick,
      endTick: this.#endTick,
      startTime: this.startTime,
      endTime: this.endTime,
      velocity: this.#velocity,
      pitchSegments: this.#pitchSegments,
      volumeSegments: this.#volumeSegments,
      panVolumeSegments: this.#panVolumeSegments,
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
 * The instance holds a native Wasm resource and must be released when no
 * longer needed. Call {@link close} explicitly to free the resource promptly.
 *
 * @example
 * ```ts
 * const ctx = new AudioContext();
 * const pxtone = new Pxtone({ sampleRate: ctx.sampleRate });
 * pxtone.read(fileBytes);
 * const stream = pxtone.stream();
 * // ...
 * pxtone.close();
 * ```
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

  #loopStartFrame = 0;
  #loopEndFrame = 0;
  #loopLength = 0;

  #ticksPerFrame = 0;

  #state: "idle" | "ready" | "streaming" | "disposed" = "idle";
  #currentFrame = 0;

  #units: readonly PxtoneUnit[] | null = null;
  #events: readonly PxtoneEvent[] | null = null;
  #notes: readonly PxtoneNote[] | null = null;

  /**
   * Returns `true` if `buffer` is a valid `.ptcop` / `.pttune` file, `false` otherwise.
   * Does not create a persistent service instance.
   *
   * @example
   * ```ts
   * const isValid = Pxtone.validate(fileBytes);
   * ```
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
   *
   * @example
   * ```ts
   * const isValid = Pxtone.validateNoiseData(fileBytes);
   * ```
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

  constructor(options: PxtoneOptions = {}) {
    const { numberOfChannels = 2, sampleRate = 44100 } = options;
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
   * Releases the underlying Wasm resource.
   * Safe to call multiple times; subsequent calls are no-ops.
   *
   * If called while a stream is active, the Wasm memory is not freed immediately —
   * it is freed when the next chunk is pulled (the stream will error) or when the
   * stream is cancelled.
   */
  close(): void {
    if (this.#state === "disposed") return;
    const wasStreaming = this.#state === "streaming";
    this.#state = "disposed";
    this.#release();
    Pxtone.#registry.unregister(this);
    if (!wasStreaming) {
      service_free(this.#ptr);
    }
  }

  /** Alias for {@link close}. Available only in environments that support `Symbol.dispose`. */
  declare [Symbol.dispose]: () => void;

  static {
    // Alias close() as Symbol.dispose for environments that support Explicit Resource Management.
    if (typeof Symbol.dispose !== "undefined") {
      Object.defineProperty(Pxtone.prototype, Symbol.dispose, {
        configurable: true,
        writable: true,
        value: Pxtone.prototype.close,
      });
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
    return Math.round(this.#resolveCurrentFrame() * this.#ticksPerFrame);
  }

  /** Current playback position in seconds, updated as each chunk is pulled from the stream. */
  get currentTime(): number {
    if (this.#state !== "ready" && this.#state !== "streaming") {
      return 0;
    }
    return this.#resolveCurrentFrame() / this.#sampleRate;
  }

  #resolveCurrentFrame(): number {
    const currentFrame = this.#currentFrame;
    if (this.#loopStartMeasure !== 0) {
      const loopLength = this.#loopLength;
      if (loopLength > 0 && currentFrame > this.#loopEndFrame) {
        return this.#loopStartFrame + (currentFrame - this.#loopEndFrame) % loopLength;
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
      this.#units ??= Object.freeze([]);
    } else {
      this.#units = this.#loadUnits();
    }
    return this.#units;
  }

  /** Automation events ordered by tick and pxtone event priority. */
  get events(): readonly PxtoneEvent[] {
    if (this.#events !== null) {
      return this.#events;
    }
    if (this.#state === "idle" || this.#state === "disposed") {
      this.#units ??= Object.freeze([]);
      this.#events ??= Object.freeze([]);
    } else {
      const units = this.#units ??= this.#loadUnits();
      this.#events = this.#loadEvents(units);
    }
    return this.#events;
  }

  /**
   * Notes in the loaded song, including pitch, volume, and stereo-pan segments.
   *
   * Ordered by {@link PxtoneNote.startTick}; notes starting on the same tick follow the order
   * of {@link units}. Drawing them in this order therefore starts earlier notes first.
   */
  get notes(): readonly PxtoneNote[] {
    if (this.#notes !== null) {
      return this.#notes;
    }
    if (this.#state === "idle" || this.#state === "disposed") {
      this.#units ??= Object.freeze([]);
      this.#events ??= Object.freeze([]);
      this.#notes ??= Object.freeze([]);
    } else {
      const units = this.#units ??= this.#loadUnits();
      const events = this.#events ??= this.#loadEvents(units);
      this.#notes = this.#loadNotes(units, events);
    }
    return this.#notes;
  }

  /**
   * Resets the instance to its initial idle state, releasing all song data.
   *
   * @throws {PxtoneError} If the instance has been disposed ({@link PxtoneError.CODE_DISPOSED}) or a stream is active ({@link PxtoneError.CODE_STREAMING_ACTIVE}).
   * @example
   * ```ts
   * pxtone.read(file1Bytes);
   * pxtone.clear();
   * pxtone.read(file2Bytes);
   * ```
   */
  clear(): void {
    if (this.#state === "disposed") {
      throw new PxtoneError("This Pxtone instance has already been disposed.", {
        code: PxtoneError.CODE_DISPOSED,
      });
    }
    if (this.#state === "streaming") {
      throw new PxtoneError("Cannot clear while audio stream is active.", {
        code: PxtoneError.CODE_STREAMING_ACTIVE,
      });
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
    this.#loopStartFrame = 0;
    this.#loopEndFrame = 0;
    this.#loopLength = 0;
    this.#ticksPerFrame = 0;
    this.#currentFrame = 0;
    this.#invalidateSongData();
  }

  #invalidateSongData() {
    if (this.#units !== null) {
      for (let i = 0; i < this.#units.length; ++i) {
        releaseUnitPtr(this.#units[i]);
      }
    }
    this.#units = null;
    this.#events = null;
    this.#notes = null;
  }

  /**
   * Loads a `.ptcop` or `.pttune` file and prepares it for playback.
   * Populates {@link name}, {@link comment}, {@link ticksPerBeat}, {@link beatsPerMeasure},
   * {@link beatTempo}, {@link numberOfMeasures}, {@link loopStartMeasure}, {@link loopEndMeasure},
   * {@link numberOfTicks}, {@link duration}, {@link loopStart}, {@link loopEnd},
   * and enables lazy access to {@link units}, {@link events}, and {@link notes}.
   *
   * @param buffer - Raw file bytes.
   * @throws {PxtoneError} If the instance has been disposed ({@link PxtoneError.CODE_DISPOSED}), a stream is active ({@link PxtoneError.CODE_STREAMING_ACTIVE}), or the file is invalid ({@link PxtoneError.CODE_READ_FAILED}, {@link PxtoneError.CODE_TONES_READY_FAILED}).
   * @example
   * ```ts
   * const response = await fetch("song.ptcop");
   * pxtone.read(await response.arrayBuffer());
   * ```
   */
  read(buffer: ArrayBuffer | Uint8Array): void {
    if (this.#state === "streaming") {
      throw new PxtoneError("Cannot load new data while audio stream is active.", {
        code: PxtoneError.CODE_STREAMING_ACTIVE,
      });
    }
    if (this.#state === "disposed") {
      throw new PxtoneError("This Pxtone instance has already been disposed.", {
        code: PxtoneError.CODE_DISPOSED,
      });
    }

    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const memPtr = alloc(bytes.length);
    try {
      new Uint8Array(memory.buffer, memPtr, bytes.length).set(bytes);
      if (service_read(this.#ptr, memPtr, bytes.length) !== 0) {
        throw new PxtoneError("Failed to load the pxtone data.", {
          code: PxtoneError.CODE_READ_FAILED,
        });
      }
    } finally {
      dealloc(memPtr, bytes.length);
    }
    if (service_tones_ready(this.#ptr) !== 0) {
      throw new PxtoneError("Failed to initialize audio tones.", {
        code: PxtoneError.CODE_TONES_READY_FAILED,
      });
    }
    this.#invalidateSongData();
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
    const spm = (beatsPerMeasure * 60) / beatTempo;
    this.#secondsPerMeasure = spm;
    this.#numberOfMeasures = measureCount;
    this.#loopStartMeasure = repeatMeasure;
    this.#loopEndMeasure = lastMeasure !== 0 ? lastMeasure : measureCount;
    const sr = this.#sampleRate;
    this.#loopStartFrame = Math.round(this.#loopStartMeasure * spm * sr);
    this.#loopEndFrame = Math.round(this.#loopEndMeasure * spm * sr);
    this.#loopLength = Math.round(
      (this.#loopEndMeasure - this.#loopStartMeasure) * spm * sr,
    );
    this.#ticksPerFrame = (beatsPerMeasure * ticksPerBeat) / (spm * sr);
    this.#currentFrame = 0;
    this.#state = "ready";
  }

  /**
   * Returns a `ReadableStream` that yields PCM chunks as {@link AudioData} objects
   * (format `"f32-planar"`).
   *
   * Only one stream may be active at a time. The stream ends naturally when the
   * song finishes (or the loop point is reached with `loop: false`).
   *
   * @throws {PxtoneError} If the instance has been disposed ({@link PxtoneError.CODE_DISPOSED}), {@link read} has not been called ({@link PxtoneError.CODE_NOT_READY}), or a stream is already active ({@link PxtoneError.CODE_STREAMING_ACTIVE}).
   * @example
   * ```ts
   * const stream = pxtone.stream({ loop: true });
   * const reader = stream.getReader();
   * while (true) {
   *   const { done, value: audioData } = await reader.read();
   *   if (done) break;
   *   // copy into an AudioBuffer, or forward to AudioWorklet, MediaStreamTrackGenerator, etc.
   *   audioData.close();
   * }
   * ```
   */
  stream(options: StreamOptions = {}): ReadableStream<AudioData> {
    const {
      startTime = 0,
      unitMute = false,
      loop = false,
      numberOfFrames = 1024,
      highWaterMark = 1,
      signal,
    } = options;
    if (this.#state === "idle") {
      throw new PxtoneError("No pxtone data has been loaded. Call read() first.", {
        code: PxtoneError.CODE_NOT_READY,
      });
    }
    if (this.#state === "streaming") {
      throw new PxtoneError("An audio stream is already active.", {
        code: PxtoneError.CODE_STREAMING_ACTIVE,
      });
    }
    if (this.#state === "disposed") {
      throw new PxtoneError("This Pxtone instance has already been disposed.", {
        code: PxtoneError.CODE_DISPOSED,
      });
    }

    const channels = this.#numberOfChannels!;
    const sampleRate = this.#sampleRate!;
    const bytesPerFrame = channels * 2;
    const chunkBytes = numberOfFrames * bytesPerFrame;
    const microsPerSample = 1_000_000 / sampleRate;
    const startSample = Math.round(startTime * sampleRate);

    if (
      service_moo_preparation(
        this.#ptr,
        startSample,
        unitMute ? 1 : 0,
        loop ? 1 : 0,
      ) !== 0
    ) {
      throw new PxtoneError("Failed to prepare audio playback.", {
        code: PxtoneError.CODE_PLAYBACK_PREPARATION_FAILED,
      });
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
            controller.error(
              new PxtoneError("This Pxtone instance has already been disposed.", {
                code: PxtoneError.CODE_DISPOSED,
              }),
            );
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
          const writtenFrames = writtenBytes / bytesPerFrame;
          const audioData = pcmToAudioData({
            data: new Int16Array(memory.buffer, bufPtr, writtenFrames * channels),
            sampleRate,
            numberOfFrames: writtenFrames,
            numberOfChannels: channels,
            timestamp: Math.round(currentFrame * microsPerSample),
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
   * @throws {PxtoneError} If the instance has been disposed ({@link PxtoneError.CODE_DISPOSED}) or rendering fails ({@link PxtoneError.CODE_RENDER_NOISE_FAILED}).
   * @example
   * ```ts
   * const ctx = new AudioContext();
   * const pxtone = new Pxtone({ sampleRate: ctx.sampleRate });
   * const audioData = await pxtone.decodeNoiseData(fileBytes);
   * // ...
   * pxtone.close();
   * ```
   */
  decodeNoiseData(
    buffer: ArrayBuffer | Uint8Array,
  ): Promise<AudioData> {
    if (this.#state === "disposed") {
      return Promise.reject(
        new PxtoneError("This Pxtone instance has already been disposed.", {
          code: PxtoneError.CODE_DISPOSED,
        }),
      );
    }
    try {
      const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const dataPtr = alloc(bytes.length);
      try {
        new Uint8Array(memory.buffer, dataPtr, bytes.length).set(bytes);
        // Deno-generated Wasm types do not support Multi-Value returns.
        const { 0: samplesPtr, 1: samplesLen } = service_render_noise(
          this.#ptr,
          dataPtr,
          bytes.length,
        ) as unknown as [number, number];
        if (!samplesPtr) {
          throw new PxtoneError("Failed to render noise data.", {
            code: PxtoneError.CODE_RENDER_NOISE_FAILED,
          });
        }
        const ptr = samplesPtr >>> 0;
        const len = samplesLen >>> 0;
        try {
          const channels = this.#numberOfChannels;
          return Promise.resolve(
            pcmToAudioData({
              data: new Int16Array(memory.buffer, ptr, len / 2),
              sampleRate: this.#sampleRate,
              numberOfFrames: len / (channels * 2),
              numberOfChannels: channels,
              timestamp: 0,
            }),
          );
        } finally {
          dealloc(ptr, len);
        }
      } finally {
        dealloc(dataPtr, bytes.length);
      }
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
    events.sort((a, b) =>
      a.tick - b.tick || pxtoneEventPriority(a.kind) - pxtoneEventPriority(b.kind)
    );
    return Object.freeze(events);
  }

  #loadNotes(
    units: readonly PxtoneUnit[],
    events: readonly PxtoneEvent[],
  ): readonly PxtoneNote[] {
    const timing = Object.freeze({
      secondsPerTick: 60 / (this.#beatTempo! * this.#ticksPerBeat!),
    });
    const notes = buildNotes(units, events, {
      createPitchSegment(startTick, endTick, startKey, endKey, targetKey, interpolation) {
        // @ts-expect-error: allow private constructor
        return new PxtonePitchSegment(
          illegalConstructorKey,
          startTick,
          endTick,
          startKey,
          endKey,
          targetKey,
          interpolation,
          timing,
        );
      },
      createVolumeSegment(startTick, endTick, value) {
        // @ts-expect-error: allow private constructor
        return new PxtoneVolumeSegment(
          illegalConstructorKey,
          startTick,
          endTick,
          value,
          timing,
        );
      },
      createPanVolumeSegment(startTick, endTick, value) {
        // @ts-expect-error: allow private constructor
        return new PxtonePanVolumeSegment(
          illegalConstructorKey,
          startTick,
          endTick,
          value,
          timing,
        );
      },
      createNote(
        unit,
        startTick,
        endTick,
        velocity,
        pitchSegments,
        volumeSegments,
        panVolumeSegments,
      ) {
        // @ts-expect-error: allow private constructor
        return new PxtoneNote(
          illegalConstructorKey,
          unit,
          startTick,
          endTick,
          velocity,
          Object.freeze(pitchSegments),
          Object.freeze(volumeSegments),
          Object.freeze(panVolumeSegments),
          timing,
        );
      },
    });
    return Object.freeze(notes);
  }
}
