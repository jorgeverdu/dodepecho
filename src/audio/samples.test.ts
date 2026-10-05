import { expect, it, vi } from "vitest";
import {
  loadSample,
  nearestSample,
  samplePlaybackRate,
  SAMPLE_NOTES,
} from "./samples";

it("elige la muestra más cercana en todo el teclado", () => {
  expect(SAMPLE_NOTES).toHaveLength(30);
  expect(nearestSample(60)).toEqual([60, "C4"]);
  expect(nearestSample(61)).toEqual([60, "C4"]);
  expect(nearestSample(62)).toEqual([63, "Ds4"]);
  expect(nearestSample(21)).toEqual([21, "A0"]);
  expect(nearestSample(108)).toEqual([108, "C8"]);
  for (let midi = 21; midi <= 108; midi++)
    expect(Math.abs(nearestSample(midi)[0] - midi)).toBeLessThanOrEqual(2);
});

it("calcula playbackRate por semitonos", () => {
  expect(samplePlaybackRate(60, 60)).toBe(1);
  expect(samplePlaybackRate(72, 60)).toBe(2);
  expect(samplePlaybackRate(61, 60)).toBeCloseTo(2 ** (1 / 12));
  expect(samplePlaybackRate(62, 63)).toBeCloseTo(2 ** (-1 / 12));
});

it("descarga y decodifica una sola vez aunque se solicite en paralelo y después", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
  vi.stubGlobal("fetch", fetchMock);
  const buffer = { duration: 2 } as AudioBuffer;
  const context = {
    decodeAudioData: vi.fn(async () => buffer),
  } as unknown as AudioContext;
  try {
    const sample = nearestSample(45);
    const [a, b] = await Promise.all([
      loadSample(context, sample),
      loadSample(context, sample),
    ]);
    const c = await loadSample(context, sample);
    expect(a).toBe(buffer);
    expect(b).toBe(buffer);
    expect(c).toBe(buffer);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});
