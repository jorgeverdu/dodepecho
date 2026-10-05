import { expect, it } from "vitest";
import {
  clampPianoVolumePercent,
  DEFAULT_PIANO_VOLUME_PERCENT,
} from "./volume";

it("admite 0–200 % y limita valores no válidos", () => {
  expect(DEFAULT_PIANO_VOLUME_PERCENT).toBe(140);
  for (const value of [0, 100, 140, 200])
    expect(clampPianoVolumePercent(value)).toBe(value);
  expect(clampPianoVolumePercent(-4)).toBe(0);
  expect(clampPianoVolumePercent(230)).toBe(200);
  expect(clampPianoVolumePercent(Number.NaN)).toBe(140);
});
