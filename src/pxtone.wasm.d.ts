/** Wasm linear memory shared with the host. */
export declare const memory: WebAssembly.Memory;

/**
 * Allocates `size` bytes on the Wasm heap and returns a pointer.
 * Returns 0 if `size` is 0 or allocation fails.
 * Free with {@link dealloc}.
 */
export declare const alloc: (size: number) => number;

/**
 * Frees a buffer previously allocated by {@link alloc}.
 * `ptr` and `size` must match the original allocation.
 */
export declare const dealloc: (ptr: number, size: number) => void;

/**
 * Creates a new service instance and returns an owning pointer.
 * `channels` must be `1` (mono) or `2` (stereo); returns null (0) otherwise.
 * Free with {@link service_free}.
 */
export declare const service_new: (channels: number, sampleRate: number) => number;

/**
 * Frees a service instance created by {@link service_new}.
 * The pointer must not be used after this call.
 */
export declare const service_free: (ptr: number) => void;

/**
 * Reads a `.ptcop`/`.pttune` file from `data[..len]` into the service.
 * Returns 0 on success, -1 on failure.
 */
export declare const service_read: (
  svc: number,
  data: number,
  len: number,
) => number;

/**
 * Prepares synthesizer tones. Must be called after {@link service_read}.
 * Returns 0 on success, -1 on failure.
 */
export declare const service_tones_ready: (svc: number) => number;

/**
 * Prepares playback. Must be called after {@link service_tones_ready}.
 * Returns 0 on success, -1 on failure or if `svc` is null.
 *
 * @param startSample - Sample offset to start from; `0` means the beginning of the song.
 * @param unitMute - Non-zero to mute units whose played flag is false.
 * @param loop - Non-zero to loop playback from the song's repeat point.
 */
export declare const service_moo_preparation: (
  svc: number,
  startSample: number,
  unitMute: number,
  loop: number,
) => number;

/**
 * Renders the next chunk of PCM samples into `buf[..len]` (signed 16-bit interleaved).
 * Returns the buffer pointer and the number of bytes actually written.
 * `writtenLen` may be less than `len` at the end of the song, and `0` when playback has ended.
 * Apply `>>> 0` to `writtenLen` before use — Wasm i32 is sign-extended to JS number.
 */
export declare const service_moo: (
  svc: number,
  buf: number,
  len: number,
) => [ptr: number, writtenLen: number];

/**
 * Renders a `.ptnoise` file and returns a pointer to the allocated PCM buffer
 * (signed 16-bit interleaved) and its byte length.
 * The caller must free the buffer with `dealloc(ptr, samplesLen)`.
 * Returns `[0, 0]` on failure.
 */
export declare const service_render_noise: (
  svc: number,
  data: number,
  dataLen: number,
) => [ptr: number, samplesLen: number];

/**
 * Returns master timing information for the loaded song in a single call.
 * Tuple order: `[ticksPerBeat, beatsPerMeasure, beatTempo, measureCount, repeatMeasure, lastMeasure]`.
 * `beatTempo` is in beats per minute (floating-point).
 */
export declare const service_get_master: (
  svc: number,
) => [
  ticksPerBeat: number,
  beatsPerMeasure: number,
  beatTempo: number,
  measureCount: number,
  repeatMeasure: number,
  lastMeasure: number,
];

/**
 * Returns a pointer to the song title as raw Shift-JIS bytes and the byte length.
 * The pointer is valid as long as the service is alive and unmodified.
 * Returns `[0, 0]` if no title is set.
 */
export declare const service_get_text_name: (
  svc: number,
) => [ptr: number, len: number];

/**
 * Returns a pointer to the song comment as raw Shift-JIS bytes and the byte length.
 * The pointer is valid as long as the service is alive and unmodified.
 * Returns `[0, 0]` if no comment is set.
 */
export declare const service_get_text_comment: (
  svc: number,
) => [ptr: number, len: number];

/**
 * Returns the number of units in the loaded song.
 * Returns 0 on error.
 */
export declare const service_get_unit_count: (svc: number) => number;

/**
 * Returns a pointer to the unit's raw name bytes and the byte length.
 * The pointer is valid as long as the service is alive and unmodified.
 * Returns `[0, 0]` if `idx` is out of range.
 */
export declare const service_get_unit_name: (
  svc: number,
  idx: number,
) => [ptr: number, len: number];

/**
 * Returns 1 if the unit at `idx` is active (not muted), 0 if muted, -1 on error.
 */
export declare const service_get_unit_played: (
  svc: number,
  idx: number,
) => number;

/**
 * Sets whether the unit at `idx` is active (not muted). Pass 1 to unmute, 0 to mute.
 * Returns 0 on success, -1 on error.
 */
export declare const service_set_unit_played: (
  svc: number,
  idx: number,
  played: number,
) => number;

/**
 * Returns the number of events in the loaded song.
 * Returns 0 on error.
 */
export declare const service_get_event_count: (svc: number) => number;

/**
 * Returns all fields of the event at `idx` in a single call.
 * Tuple order: `[tick, unitIndex, kind, value]`.
 * Returns `[0, 0, 0, 0]` on error.
 */
export declare const service_get_event: (
  svc: number,
  idx: number,
) => [tick: number, unitIndex: number, kind: number, value: number];

/**
 * Validates a `.ptcop`/`.pttune` file from `data[..len]` without creating a persistent service.
 * Returns 0 if valid, -1 otherwise.
 */
export declare const validate: (data: number, len: number) => number;

/**
 * Validates a `.ptnoise` file from `data[..len]` without using a service.
 * Returns 0 if valid, -1 otherwise.
 */
export declare const validate_noise: (data: number, len: number) => number;
