import { it, expect, vi } from "vitest";
import { PianoDriver } from "./engine";
it("detiene y desconecta cada oscilador futuro al cancelar audio", () => {
  const oscillators: Array<{
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  const gains: Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    gain: {
      cancelScheduledValues: ReturnType<typeof vi.fn>;
      setValueAtTime: ReturnType<typeof vi.fn>;
      setTargetAtTime: ReturnType<typeof vi.fn>;
      value: number;
    };
  }> = [];
  const compressors: Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];
  class Context {
    currentTime = 1;
    destination = {};
    resume = vi.fn();
    close = vi.fn();
    createOscillator() {
      const osc = {
        type: "sine",
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(osc);
      return osc;
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
      const compressor = {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      compressors.push(compressor);
      return compressor;
    }
  }
  vi.stubGlobal("AudioContext", Context);
  try {
    const piano = new PianoDriver();
    expect(gains[0].gain.value).toBe(1.4);
    expect(gains[0].connect).toHaveBeenCalledWith(compressors[0]);
    piano.setVolume(185);
    expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(1.85, 1, 0.01);
    piano.play(60, 10, 0.2);
    expect(oscillators).toHaveLength(3);
    for (const gain of gains.slice(1))
      expect(gain.connect).toHaveBeenCalledWith(gains[0]);
    piano.stopAll();
    for (const osc of oscillators) {
      expect(osc.stop).toHaveBeenLastCalledWith();
      expect(osc.disconnect).toHaveBeenCalled();
    }
    for (const gain of gains.slice(1)) {
      expect(gain.gain.cancelScheduledValues).toHaveBeenCalledWith(0);
      expect(gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 1);
      expect(gain.disconnect).toHaveBeenCalled();
    }
    piano.close();
  } finally {
    vi.unstubAllGlobals();
  }
});
