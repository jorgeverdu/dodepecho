import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import { initialLibrary } from "../data/catalog";
import { instantiate, type Direction } from "../types";

function item(direction: Direction, pauseBeats = 2) {
  return {
    ...instantiate(initialLibrary().exercises[0]),
    bpm: 80,
    start: direction === "down" ? 50 : 48,
    lower: 48,
    upper: 54,
    direction,
    pauseBeats,
  };
}

describe("Pausa a ambos lados de cada transición", () => {
  it.each(["up", "down", "up-down"] as const)(
    "secuencia y tiempos exactos en %s",
    (direction) => {
      const config = item(direction);
      const { events, bases, duration } = buildTimeline([config]);
      const pauseSeconds = (60 / config.bpm) * config.pauseBeats;
      let transitions = 0;
      events.forEach((event, i) => {
        if (
          event.phase !== "transition" ||
          events[i - 1].phase === "transition"
        )
          return;
        transitions++;
        const block = events.slice(i - 2, i + 4);
        expect(block.map((e) => e.phase)).toEqual([
          "note",
          "rest",
          "transition",
          "transition",
          "rest",
          "note",
        ]);
        expect(block[1].duration).toBeCloseTo(pauseSeconds);
        expect(block[4].duration).toBeCloseTo(pauseSeconds);
        expect(block[1].midi).toBeNull();
        expect(block[4].midi).toBeNull();
        expect(block[2].midi).toBe(bases[0][event.succession - 1]);
        expect(block[3].midi).toBe(bases[0][event.succession]);
        expect(block[2].duration).toBeCloseTo((60 / config.bpm) * 0.5);
        expect(block[3].duration).toBeCloseTo((60 / config.bpm) * 0.5);
        expect(block[5].noteIndex).toBe(0);
      });
      expect(transitions).toBe(bases[0].length - 1);
      for (let i = 1; i < events.length; i++)
        expect(events[i].at).toBeCloseTo(
          events[i - 1].at + events[i - 1].duration,
        );
      expect(duration).toBeCloseTo(events.at(-1)!.at + events.at(-1)!.duration);
      expect(events[3].phase).toBe("note");
    },
  );

  it("la pausa no altera la duración de las notas de transición", () => {
    const short = buildTimeline([item("up", 0.5)]);
    const long = buildTimeline([item("up", 4)]);
    expect(
      short.events
        .filter((e) => e.phase === "transition")
        .map((e) => [e.duration, e.gate]),
    ).toEqual(
      long.events
        .filter((e) => e.phase === "transition")
        .map((e) => [e.duration, e.gate]),
    );
  });

  it("pausa cero no añade silencios artificiales", () => {
    const { events } = buildTimeline([item("up", 0)]);
    expect(events.some((e) => e.phase === "rest")).toBe(false);
    const i = events.findIndex((e) => e.phase === "transition");
    expect(events.slice(i - 1, i + 3).map((e) => e.phase)).toEqual([
      "note",
      "transition",
      "transition",
      "note",
    ]);
  });

  it("las notas usan siempre el 88 %, incluso con articulación antigua guardada", () => {
    for (const articulation of [0.2, 0.8, 1]) {
      const { events } = buildTimeline([{ ...item("up"), articulation }]);
      for (const event of events.filter((e) => e.midi !== null))
        expect(event.gate).toBeCloseTo(event.duration * 0.88);
    }
  });
});
describe("Cuenta atrás y cambios de tonalidad configurables", () => {
  it("no deja transición ni pausa extra al pasar de ejercicio", () => {
    const first = { ...item("up"), upper: 52 };
    const second = { ...item("up"), upper: 52 };
    const { events } = buildTimeline([first, second]);
    const boundary = events.findIndex((e) => e.exercise === 1);
    expect(
      events.slice(boundary - 1, boundary + 4).map((e) => e.phase),
    ).toEqual(["note", "countdown", "countdown", "countdown", "note"]);
    expect(events.slice(boundary, boundary + 3).map((e) => e.count)).toEqual([
      3, 2, 1,
    ]);
  });
  it.each([70, 80, 90])("apagado: un solo segundo de pausa a %i BPM", (bpm) => {
    const { events } = buildTimeline([{ ...item("up", 4), bpm }], false);
    expect(events.some((e) => e.phase === "transition")).toBe(false);
    for (let i = 0; i < events.length; i++) {
      if (events[i].phase !== "rest") continue;
      expect(events[i].duration).toBe(1);
      expect(events[i - 1].phase).toBe("note");
      expect(events[i + 1].phase).toBe("note");
      expect(
        events[i + 1].at - (events[i - 1].at + events[i - 1].duration),
      ).toBeCloseTo(1);
    }
    expect(events.filter((e) => e.phase === "rest")).toHaveLength(
      events.filter((e) => e.phase === "note" && e.noteIndex === 0).length - 1,
    );
  });
});
