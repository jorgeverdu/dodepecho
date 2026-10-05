import { expect, it } from "vitest";
import {
  clampPianoVolumePercent,
  DEFAULT_PIANO_VOLUME_PERCENT,
  masterGainForVolume,
} from "./volume";

it("admite 0–250 % sin alterar los valores antiguos", () => {
  expect(DEFAULT_PIANO_VOLUME_PERCENT).toBe(140);
  for (const value of [0, 100, 140, 150, 200, 250])
    expect(clampPianoVolumePercent(value)).toBe(value);
  expect(clampPianoVolumePercent(-4)).toBe(0);
  expect(clampPianoVolumePercent(300)).toBe(250);
  expect(clampPianoVolumePercent(Number.NaN)).toBe(140);
});

it("curva progresiva con silencio real al cero", () => {
  const gains = [0, 50, 100, 150, 200, 250].map(masterGainForVolume);
  expect(gains[0]).toBe(0);
  expect(gains[2]).toBe(1);
  for (let i = 1; i < gains.length; i++)
    expect(gains[i]).toBeGreaterThan(gains[i - 1]);
  expect(gains[5]).toBeLessThan(3.1);
});
