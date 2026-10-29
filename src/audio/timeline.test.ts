import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import { initialLibrary } from "../data/catalog";
import { instantiate, type Direction } from "../types";
import {
  LEGATO_ARTICULATION,
  STACCATO_ARTICULATION,
  articulationLabel,
} from "../music/timing";

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

  it("Legato y Staccato mantienen los ataques, pero cambian solo el gate del patrón", () => {
    const config = item("up");
    const legato = buildTimeline([
      { ...config, articulation: LEGATO_ARTICULATION },
    ]);
    const staccato = buildTimeline([
      { ...config, articulation: STACCATO_ARTICULATION },
    ]);
    expect(legato.duration).toBe(staccato.duration);
    expect(
      legato.events.map((event) => [event.at, event.duration, event.phase]),
    ).toEqual(
      staccato.events.map((event) => [event.at, event.duration, event.phase]),
    );
    for (let i = 0; i < legato.events.length; i++) {
      const long = legato.events[i],
        short = staccato.events[i];
      if (long.phase === "note") {
        expect(long.gate).toBeCloseTo(long.duration * 1.05);
        expect(short.gate).toBeCloseTo(short.duration * 0.45);
        expect(long.at + long.gate).toBeGreaterThan(long.at + long.duration);
        expect(short.at + short.gate).toBeLessThan(short.at + short.duration);
      } else expect(long.gate).toBe(short.gate);
    }
    expect(
      legato.events.filter((e) => e.phase === "transition").map((e) => e.gate),
    ).toEqual(
      staccato.events
        .filter((e) => e.phase === "transition")
        .map((e) => e.gate),
    );
    expect(
      legato.events
        .filter((e) => e.phase === "countdown")
        .every((e) => e.gate === 0),
    ).toBe(true);
  });

  it("interpreta la articulación antigua 0.88 como Legato sin cambiar el dato", () => {
    const old = { ...item("up"), articulation: 0.88 };
    const { events } = buildTimeline([old]);
    expect(articulationLabel(old.articulation)).toBe("Legato");
    expect(events.find((e) => e.phase === "note")!.gate).toBeCloseTo(
      events.find((e) => e.phase === "note")!.duration * LEGATO_ARTICULATION,
    );
    expect(old.articulation).toBe(0.88);
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
