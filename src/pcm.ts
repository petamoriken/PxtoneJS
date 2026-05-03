/**
 * Converts signed 16-bit interleaved PCM to an {@link AudioData} with `f32-planar` format.
 */
export function pcmToAudioData(init: {
  data: Int16Array;
  sampleRate: number;
  numberOfFrames: number;
  numberOfChannels: number;
  timestamp: number;
}): AudioData {
  const { data, sampleRate, numberOfFrames, numberOfChannels, timestamp } = init;
  const f32 = new Float32Array(numberOfFrames * numberOfChannels);
  for (let i = 0; i < numberOfFrames; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const s = data[i * numberOfChannels + ch];
      f32[ch * numberOfFrames + i] = s / 0x8000;
    }
  }
  return new AudioData({
    format: "f32-planar",
    sampleRate,
    numberOfFrames,
    numberOfChannels,
    timestamp,
    data: f32,
    transfer: [f32.buffer],
  });
}
