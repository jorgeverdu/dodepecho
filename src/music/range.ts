import type { Direction, ExerciseConfig, Pattern } from "../types";

export function firstAudibleNote(config: ExerciseConfig, pattern: Pattern) {
  return config.start + (pattern.semitones[0] ?? 0);
}

export function rangeExtreme(config: ExerciseConfig) {
  return config.direction === "down" ? config.lower : config.upper;
}

export function withAudibleRange(
  config: ExerciseConfig,
  pattern: Pattern,
  first: number,
  extreme: number,
  direction: Direction = config.direction,
): ExerciseConfig {
  const offsets = pattern.semitones.length ? pattern.semitones : [0];
  const start = first - offsets[0];
  const lowAtStart = start + Math.min(...offsets);
  const highAtStart = start + Math.max(...offsets);
  return {
    ...config,
    start,
    direction,
    lower: direction === "down" ? extreme : lowAtStart,
    upper: direction === "down" ? highAtStart : extreme,
  };
}
