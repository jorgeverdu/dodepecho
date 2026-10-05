export const DEFAULT_PIANO_VOLUME_PERCENT = 140;

export function clampPianoVolumePercent(value: number): number {
  return Number.isFinite(value)
    ? Math.min(200, Math.max(0, value))
    : DEFAULT_PIANO_VOLUME_PERCENT;
}
