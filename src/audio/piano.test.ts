import { afterEach, expect, it, vi } from "vitest";
import { PianoDriver } from "./engine";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockAudio() {
  const buffers: Array<{
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const oscillators: Array<{
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const gains: Array<{
    connect: ReturnType<typeof vi.fn>;
    gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
  }> = [];
  const compressor = {
    threshold: { value: 0 },
    knee: { value: 0 },
    ratio: { value: 0 },
    attack: { value: 0 },
    release: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  class Context {
    currentTime = 1;
    destination = {};
    resume = vi.fn();
    close = vi.fn();
    decodeAudioData = vi.fn(async () => ({ duration: 4 }));
    createBufferSource() {
      const source = {
        buffer: null,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      buffers.push(source);
      return source;
    }
    createOscillator() {
      const source = {
        type: "sine",
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(source);
      return source;
    }
    createGain() {
      const gain = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setTargetAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
      };
      gains.push(gain);
      return gain;
    }
    createDynamicsCompressor() {
      return compressor;
    }
  }
  vi.stubGlobal("AudioContext", Context);
  return { buffers, oscillators, gains, compressor };
}

it("precarga el sample y lo reproduce con el mismo bus para notas normales y transiciones", async () => {
  const audio = mockAudio();
  const fetchMock = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
  vi.stubGlobal("fetch", fetchMock);
  const piano = new PianoDriver(140, [60]);
  expect(audio.gains[0].gain.value).toBeCloseTo(1.26);
  expect(audio.gains[0].connect).toHaveBeenCalledWith(audio.compressor);
  await piano.ready();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  piano.play(60, 10, 0.2);
  piano.play(60, 11, 0.2);
  expect(audio.buffers).toHaveLength(2);
  expect(audio.oscillators).toHaveLength(0);
  for (const gain of audio.gains.slice(1))
    expect(gain.connect).toHaveBeenCalledWith(audio.gains[0]);
  piano.setVolume(200);
  expect(audio.gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(
    1.8,
    1,
    0.01,
  );
  piano.stopAll();
  for (const source of audio.buffers) {
    expect(source.stop).toHaveBeenLastCalledWith(1);
    expect(source.disconnect).toHaveBeenCalled();
  }
  piano.close();
});

it("usa los osciladores solo si falla la carga de la muestra", async () => {
  const audio = mockAudio();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("offline sin caché");
    }),
  );
  const piano = new PianoDriver(100, [84]);
  await piano.ready();
  piano.play(84, 10, 0.2);
  expect(audio.buffers).toHaveLength(0);
  expect(audio.oscillators).toHaveLength(3);
  expect(console.warn).toHaveBeenCalled();
  piano.stopAll();
  expect(
    audio.oscillators.every(
      (source) => source.disconnect.mock.calls.length > 0,
    ),
  ).toBe(true);
  piano.close();
});
