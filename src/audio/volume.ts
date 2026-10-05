export const DEFAULT_PIANO_VOLUME_PERCENT = 140;
export const SAMPLE_VOICE_GAIN = 1.45;
export const OUTPUT_HEADROOM_GAIN = 0.9;

export function clampPianoVolumePercent(value: number): number {
  return Number.isFinite(value)
    ? Math.min(250, Math.max(0, value))
    : DEFAULT_PIANO_VOLUME_PERCENT;
}

export function masterGainForVolume(value: number): number {
  return (clampPianoVolumePercent(value) / 100) ** 1.2;
}
