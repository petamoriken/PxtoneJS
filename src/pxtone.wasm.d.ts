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
 * Creates a new service instance and returns an opaque pointer.
 * Free with {@link service_free}.
 */
export declare const service_new: () => number;

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
 * Returns 1 if samples were written, 0 if playback ended.
 */
export declare const service_moo: (
  svc: number,
  buf: number,
  len: number,
) => number;

/**
 * Returns 1 if playback has reached the end, 0 otherwise.
 */
export declare const service_is_end_vomit: (svc: number) => number;

/**
 * Returns the number of output channels (e.g. 2 for stereo).
 * Returns 0 on error.
 */
export declare const service_get_channels: (svc: number) => number;

/**
 * Returns the sample rate in Hz.
 * Returns 0 on error.
 */
export declare const service_get_sample_rate: (svc: number) => number;

/**
 * Renders a `.ptnoise` file and returns a pointer to the allocated PCM buffer
 * (signed 16-bit interleaved). The caller must free it with `dealloc(ptr, outSamplesLen)`.
 * Writes the byte length to `outSamplesLen`. Use {@link service_get_channels} /
 * {@link service_get_sample_rate} for format info.
 * Returns 0 on failure.
 */
export declare const service_render_noise: (
  svc: number,
  data: number,
  dataLen: number,
  outSamplesLen: number,
) => number;

/**
 * Returns the number of ticks per beat.
 * Returns 0 on error.
 */
export declare const service_get_ticks_per_beat: (svc: number) => number;

/**
 * Returns the number of beats per measure.
 * Returns 0 on error.
 */
export declare const service_get_beats_per_measure: (svc: number) => number;

/**
 * Returns the tempo in beats per minute.
 * Returns 0 on error.
 */
export declare const service_get_beat_tempo: (svc: number) => number;

/**
 * Returns the number of measures in the loaded song.
 * Returns 0 on error.
 */
export declare const service_get_measure_num: (svc: number) => number;

/**
 * Returns the repeat position in measures.
 * Returns 0 on error.
 */
export declare const service_get_repeat_measure: (svc: number) => number;

/**
 * Returns the last measure position.
 * Returns 0 on error.
 */
export declare const service_get_last_measure: (svc: number) => number;

/**
 * Returns a pointer to the song title as raw Shift-JIS bytes and writes the byte length to
 * `outLen`. The pointer is valid as long as the service is alive and unmodified.
 * Returns 0 if no title is set.
 */
export declare const service_get_text_name: (
  svc: number,
  outLen: number,
) => number;

/**
 * Returns a pointer to the song comment as raw Shift-JIS bytes and writes the byte length to
 * `outLen`. The pointer is valid as long as the service is alive and unmodified.
 * Returns 0 if no comment is set.
 */
export declare const service_get_text_comment: (
  svc: number,
  outLen: number,
) => number;

/**
 * Returns the number of units in the loaded song.
 * Returns 0 on error.
 */
export declare const service_get_unit_count: (svc: number) => number;

/**
 * Returns a pointer to the unit's raw Shift-JIS name bytes and writes their byte length to
 * `outLen`. The pointer is valid as long as the service is alive and unmodified.
 * Returns 0 if `idx` is out of range.
 */
export declare const service_get_unit_name: (
  svc: number,
  idx: number,
  outLen: number,
) => number;

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
 * Returns the tick position of the event at `idx`, or 0 on error.
 */
export declare const service_get_event_tick: (
  svc: number,
  idx: number,
) => number;

/**
 * Returns the unit index of the event at `idx`, or 0 on error.
 */
export declare const service_get_event_unit_index: (
  svc: number,
  idx: number,
) => number;

/**
 * Returns the kind of the event at `idx`, or 0 on error.
 */
export declare const service_get_event_kind: (
  svc: number,
  idx: number,
) => number;

/**
 * Returns the value of the event at `idx`, or 0 on error.
 */
export declare const service_get_event_value: (
  svc: number,
  idx: number,
) => number;
