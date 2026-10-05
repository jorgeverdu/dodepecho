import { afterEach, describe, it, expect, vi } from "vitest";
import { PlaybackEngine, type AudioDriver } from "./engine";
import { buildTimeline } from "./timeline";
import { initialLibrary } from "../data/catalog";
import { instantiate, type RoutineItem } from "../types";
afterEach(() => vi.useRealTimers());
function fixture(overrides: Partial<RoutineItem> = {}) {
  vi.useFakeTimers();
  const active: number[] = [];
  const driver: AudioDriver = {
    now: () => Date.now() / 1000,
    ready: async () => {},
    play: vi.fn((m) => active.push(m)),
    stopAll: vi.fn(() => active.splice(0)),
    close: vi.fn(() => active.splice(0)),
  };
  const item = {
    ...instantiate(initialLibrary().exercises[0]),
    upper: 53,
    ...overrides,
  };
  const timeline = buildTimeline([item]);
  return {
    engine: new PlaybackEngine(timeline, driver, vi.fn()),
    driver,
    active,
    timeline,
  };
}
describe("Reproducción", () => {
  it("cuenta 3-2-1 y usa transición de base anterior a nueva", () => {
    const { timeline } = fixture();
    expect(timeline.events.slice(0, 3).map((e) => e.count)).toEqual([3, 2, 1]);
    expect(
      timeline.events
        .filter((e) => e.phase === "transition")
        .map((e) => e.midi),
    ).toEqual([48, 49]);
  });
  it("pausa elimina audio pendiente y reanuda coherentemente", async () => {
    const { engine, driver, active } = fixture();
    await engine.play();
    await vi.advanceTimersByTimeAsync(3200);
    expect(active.length).toBeGreaterThan(0);
    engine.pause();
    expect(active).toHaveLength(0);
    const calls = vi.mocked(driver.play).mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(vi.mocked(driver.play).mock.calls.length).toBe(calls);
    await engine.play();
    await vi.advanceTimersByTimeAsync(100);
    expect(engine.snapshot().status).toBe("playing");
    expect(active.length).toBeGreaterThan(0);
    engine.dispose();
    expect(active).toHaveLength(0);
  });
  it("saltar cancela eventos anteriores", async () => {
    const { engine, driver } = fixture();
    await engine.play();
    await vi.advanceTimersByTimeAsync(3200);
    await engine.seek(0, 1);
    expect(driver.stopAll).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(engine.snapshot().event.base).toBe(49);
    engine.dispose();
  });
  it("una pausa invalida un inicio pendiente", async () => {
    const { engine, driver } = fixture();
    let resolve!: () => void;
    driver.ready = () => new Promise<void>((r) => (resolve = r));
    const pending = engine.play();
    engine.pause();
    resolve();
    await pending;
    expect(engine.snapshot().status).toBe("paused");
    expect(driver.play).not.toHaveBeenCalled();
    engine.dispose();
  });
  it("termina sin temporizadores ni audio residual", async () => {
    const { engine, active } = fixture();
    await engine.play();
    await vi.advanceTimersByTimeAsync(20000);
    expect(engine.snapshot().status).toBe("complete");
    expect(active).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    engine.dispose();
  });
});

describe("Scheduler con pausa–transición–pausa", () => {
  it.each(["up", "down", "up-down"] as const)(
    "programa el audio con ambas pausas en %s",
    async (direction) => {
      const { engine, driver, timeline } = fixture({
        bpm: 80,
        upper: 54,
        start: direction === "down" ? 50 : 48,
        direction,
      });
      const origin = driver.now() + 0.06;
      await engine.play();
      await vi.advanceTimersByTimeAsync((timeline.duration + 0.2) * 1000);
      const audible = timeline.events.filter((e) => e.midi !== null);
      const calls = vi.mocked(driver.play).mock.calls;
      expect(calls).toHaveLength(audible.length);
      audible.forEach((e, i) => {
        expect(calls[i][0]).toBe(e.midi);
        expect(calls[i][1] - origin).toBeCloseTo(e.at, 5);
        expect(calls[i][2]).toBeCloseTo(e.gate, 5);
      });
      expect(engine.snapshot().status).toBe("complete");
      expect(vi.getTimerCount()).toBe(0);
      engine.dispose();
    },
  );

  it.each(["antes", "durante", "después"] as const)(
    "pausar %s de la transición cancela incluso notas futuras",
    async (position) => {
      const { engine, driver, active, timeline } = fixture({
        bpm: 80,
        upper: 54,
      });
      const firstTransition = timeline.events.findIndex(
        (e) => e.phase === "transition",
      );
      const target =
        timeline.events[
          firstTransition +
            (position === "antes" ? -1 : position === "durante" ? 0 : 2)
        ];
      await engine.play();
      await vi.advanceTimersByTimeAsync(
        (0.06 + target.at + target.duration - 0.05) * 1000,
      );
      expect(engine.snapshot().event).toEqual(target);
      expect(
        vi
          .mocked(driver.play)
          .mock.calls.some((call) => call[1] > driver.now()),
      ).toBe(true);
      engine.pause();
      expect(active).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
      const calls = vi.mocked(driver.play).mock.calls.length;
      await vi.advanceTimersByTimeAsync(3000);
      expect(vi.mocked(driver.play).mock.calls).toHaveLength(calls);
      await engine.play();
      await vi.advanceTimersByTimeAsync(100);
      expect(engine.snapshot().event).toEqual(target);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync((timeline.duration + 1) * 1000);
      expect(engine.snapshot().status).toBe("complete");
      expect(active).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
      engine.dispose();
    },
  );

  for (const direction of ["up", "down", "up-down"] as const) {
    it.each([0, 1])(
      `mantiene el timing después de saltar a sucesión %i en ${direction}`,
      async (target) => {
        const { engine, driver, timeline } = fixture({
          bpm: 80,
          upper: 54,
          start: direction === "down" ? 50 : 48,
          direction,
        });
        await engine.play();
        await engine.seek(0, target === 0 ? 1 : 0);
        vi.mocked(driver.play).mockClear();
        const origin = driver.now() + 0.06;
        await engine.seek(0, target);
        const first = timeline.events.find(
          (e) => e.succession === target && e.phase === "note",
        )!;
        await vi.advanceTimersByTimeAsync(100);
        expect(engine.snapshot().event).toEqual(first);
        await vi.advanceTimersByTimeAsync((timeline.duration + 0.2) * 1000);
        const audible = timeline.events.filter(
          (e) => e.midi !== null && e.at >= first.at,
        );
        const calls = vi.mocked(driver.play).mock.calls;
        expect(calls).toHaveLength(audible.length);
        audible.forEach((e, i) => {
          expect(calls[i][0]).toBe(e.midi);
          expect(calls[i][1] - origin).toBeCloseTo(e.at - first.at, 5);
        });
        expect(driver.stopAll).toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
        engine.dispose();
      },
    );
  }
});
