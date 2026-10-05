export const DEFAULT_PIANO_VOLUME_PERCENT = 140;
export const SAMPLE_PEAK_TARGET = 0.55;
export const OUTPUT_HEADROOM_GAIN = 0.96;
export const LIMITER_INPUT_SCALE = 0.125;
const LIMITER_KNEE = 0.82;
const LIMITER_RANGE = 0.15;
const VOLUME_GAINS = [0, 0.6, 1.35, 2.15, 2.7, 3.3];

export function clampPianoVolumePercent(value: number): number {
  return Number.isFinite(value)
    ? Math.min(250, Math.max(0, value))
    : DEFAULT_PIANO_VOLUME_PERCENT;
}

export function masterGainForVolume(value: number): number {
  const position = clampPianoVolumePercent(value) / 50;
  const index = Math.min(VOLUME_GAINS.length - 2, Math.floor(position));
  return (
    VOLUME_GAINS[index] +
    (VOLUME_GAINS[index + 1] - VOLUME_GAINS[index]) * (position - index)
  );
}

export function normalizedSampleGain(buffer: AudioBuffer): number {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++)
      peak = Math.max(peak, Math.abs(data[i]));
  }
  return peak > 0 ? SAMPLE_PEAK_TARGET / peak : 0;
}

export function limitPeak(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude <= LIMITER_KNEE) return value;
  return (
    Math.sign(value) *
    (LIMITER_KNEE +
      LIMITER_RANGE *
        (1 - Math.exp(-(magnitude - LIMITER_KNEE) / LIMITER_RANGE)))
  );
}

export function limiterCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(65537 * 4));
  for (let i = 0; i < curve.length; i++) {
    // The preceding GainNode maps ±8 of headroom onto WaveShaperNode's ±1 input.
    const input = ((i / (curve.length - 1)) * 2 - 1) / LIMITER_INPUT_SCALE;
    curve[i] = limitPeak(input);
  }
  return curve;
}
