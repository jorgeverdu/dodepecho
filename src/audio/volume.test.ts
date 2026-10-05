import { expect, it } from "vitest";
import {
  clampPianoVolumePercent,
  DEFAULT_PIANO_VOLUME_PERCENT,
  limitPeak,
  limiterCurve,
  masterGainForVolume,
  normalizedSampleGain,
  OUTPUT_HEADROOM_GAIN,
  SAMPLE_PEAK_TARGET,
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
  expect(gains).toEqual([0, 0.6, 1.35, 2.15, 2.7, 3.3]);
  for (let i = 1; i < gains.length; i++)
    expect(gains[i]).toBeGreaterThan(gains[i - 1]);
  expect(gains[5] / gains[4]).toBeGreaterThan(1.2);
});

it("normaliza el pico máximo de ambos canales sin alterar el AudioBuffer", () => {
  const left = new Float32Array([0.1, -0.2]);
  const right = new Float32Array([0.4, -0.1]);
  const buffer = {
    numberOfChannels: 2,
    getChannelData: (channel: number) => [left, right][channel],
  } as AudioBuffer;
  const gain = normalizedSampleGain(buffer);
  expect(gain).toBeCloseTo(SAMPLE_PEAK_TARGET / 0.4);
  expect(
    Math.max(
      ...left.map((value) => Math.abs(value * gain)),
      ...right.map((value) => Math.abs(value * gain)),
    ),
  ).toBeCloseTo(SAMPLE_PEAK_TARGET);
  expect(right[0]).toBeCloseTo(0.4);
});

it("el limitador deja intactas las notas normales y reserva margen ante picos", () => {
  expect(limitPeak(0)).toBe(0);
  expect(limitPeak(0.7)).toBe(0.7);
  expect(limitPeak(-0.7)).toBe(-0.7);
  expect(limitPeak(1.5) * OUTPUT_HEADROOM_GAIN).toBeLessThan(0.94);
  expect(limitPeak(8) * OUTPUT_HEADROOM_GAIN).toBeLessThan(0.94);
  const curve = limiterCurve();
  expect(curve[32768]).toBe(0);
  expect(curve[0]).toBeGreaterThan(-1);
  expect(curve[curve.length - 1]).toBeLessThan(1);
});

it("los niveles pico y RMS crecen de 100 a 250 %, incluso tras limitar", () => {
  const signal = Array.from({ length: 100 }, (_, i) =>
    i === 20 ? 0.55 : 0.1 * Math.sin(i),
  );
  const levels = [100, 150, 200, 250].map((percent) => {
    const samples = signal.map(
      (value) =>
        limitPeak(value * masterGainForVolume(percent)) * OUTPUT_HEADROOM_GAIN,
    );
    return {
      peak: Math.max(...samples.map(Math.abs)),
      rms: Math.sqrt(
        samples.reduce((sum, value) => sum + value ** 2, 0) / samples.length,
      ),
    };
  });
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i].peak).toBeGreaterThan(levels[i - 1].peak);
    expect(levels[i].rms).toBeGreaterThan(levels[i - 1].rms);
    expect(levels[i].peak).toBeLessThan(1);
  }
  expect(levels[3].rms / levels[2].rms).toBeGreaterThan(1.1);
});
