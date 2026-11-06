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

describe("Pulso del metrónomo", () => {
  it("mantiene una rejilla por ejercicio a través de pausas y transiciones, y cambia de BPM después del nuevo 3–2–1", () => {
    const first = { ...item("up"), bpm: 80, noteBeats: 0.5 };
    const second = { ...item("up"), bpm: 110, noteBeats: 1 };
    const timeline = buildTimeline([first, second]);
    for (const [exercise, bpm] of [80, 110].entries()) {
      const start = timeline.events.find((event) => event.exercise === exercise && event.phase === "note")!.at;
      const end = timeline.events.find((event) => event.exercise === exercise + 1)?.at ?? timeline.duration;
      const beats = timeline.metronomeBeats.filter((at) => at >= start && at < end);
      expect(beats[0]).toBeCloseTo(start);
      beats.forEach((at, index) => expect(at).toBeCloseTo(start + index * 60 / bpm, 8));
      expect(beats.length).toBeGreaterThan(5);
    }
    expect(timeline.metronomeBeats.some((at) => timeline.events.some((event) =>
      event.exercise === 0 && event.phase === "rest" && at >= event.at - 1e-8 && at < event.at + event.duration - 1e-8,
    ))).toBe(true);
    expect(timeline.metronomeBeats.some((at) => timeline.events.some((event) =>
      event.exercise === 0 && event.phase === "transition" && at >= event.at - 1e-8 && at < event.at + event.duration - 1e-8,
    ))).toBe(true);
    expect(timeline.metronomeBeats.some((at) => timeline.events.some((event) =>
      event.phase === "countdown" && at >= event.at && at < event.at + event.duration,
    ))).toBe(false);
  });

  it("5 notas de medio beat acaban en 2,5: la pausa y transición avanzan sin reiniciar clicks", () => {
    const beat = 0.5;
    const timeline = buildTimeline([{ ...item("up", 0.5), bpm: 120, noteBeats: 0.5 }]);
    const events = timeline.events;
    const notes = events.filter((event) => event.succession === 0 && event.phase === "note");
    const start = notes[0].at;
    expect(notes.at(-1)!.at + notes.at(-1)!.duration).toBeCloseTo(start + 2.5 * beat);
    const transition = events.filter((event) => event.succession === 1 && event.phase === "transition");
    const before = events[events.indexOf(transition[0]) - 1];
    const after = events[events.indexOf(transition[1]) + 1];
    const nextPattern = events.find((event) => event.succession === 1 && event.phase === "note")!;
    expect(before.phase).toBe("rest");
    expect(before.at).toBeCloseTo(start + 2.5 * beat);
    expect(transition[0].at).toBeCloseTo(start + 3 * beat);
    expect(transition[1].at - transition[0].at).toBeCloseTo(0.5 * beat);
    expect(transition[0].duration).toBeCloseTo(0.5 * beat);
    expect(transition[1].duration).toBeCloseTo(0.5 * beat);
    expect(after.phase).toBe("rest");
    expect(after.at).toBeCloseTo(transition[0].at + beat);
    expect(nextPattern.at).toBeCloseTo(start + 4.5 * beat);
    expect(timeline.metronomeBeats.slice(0, 6)).toEqual(
      Array.from({ length: 6 }, (_, n) => start + n * beat),
    );
    expect(timeline.metronomeBeats).not.toContain(nextPattern.at);
  });

  it.each([60, 120])("pauseBeats sigue siendo musical a %i BPM", (bpm) => {
    for (const pauseBeats of [0.5, 1, 2]) {
      const { events } = buildTimeline([{ ...item("up", pauseBeats), bpm }]);
      const beat = 60 / bpm;
      const rests = events.filter((event) => event.phase === "rest");
      expect(rests.length).toBeGreaterThan(0);
      rests.forEach((event) => expect(event.duration).toBeCloseTo(pauseBeats * beat, 8));
      const transition = events.filter((event) => event.phase === "transition");
      expect(transition[0].duration).toBeCloseTo(0.5 * beat, 8);
      expect(transition[1].at - transition[0].at).toBeCloseTo(0.5 * beat, 8);
      expect(transition[1].at + transition[1].duration - transition[0].at).toBeCloseTo(beat, 8);
    }
  });

  it.each([0.25, 0.5, 1, 2])("mantiene la rejilla con duración por nota %s beats", (noteBeats) => {
    const beat = 60 / 120;
    const timeline = buildTimeline([{ ...item("up", 0.5), bpm: 120, noteBeats }]);
    const notes = timeline.events.filter((event) => event.succession === 0 && event.phase === "note");
    const start = notes[0].at;
    notes.forEach((event, index) => expect(event.at).toBeCloseTo(start + index * noteBeats * beat, 8));
    const transition = timeline.events.find((event) => event.phase === "transition")!;
    expect(transition.at).toBeCloseTo(start + (notes.length * noteBeats + 0.5) * beat, 8);
    timeline.metronomeBeats.forEach((at, index) =>
      expect(at).toBeCloseTo(start + index * beat, 8),
    );
  });

  it("reinicia la fase al comenzar cada sucesión sin marcar la pausa fija", () => {
    const timeline = buildTimeline([{ ...item("up"), noteBeats: 0.5 }], false);
    for (const start of timeline.events.filter((event) =>
      event.phase === "note" && event.noteIndex === 0,
    )) expect(timeline.metronomeBeats).toContain(start.at);
    for (const at of timeline.metronomeBeats) {
      const event = timeline.events.find((candidate) =>
        candidate.at <= at && at < candidate.at + candidate.duration,
      );
      expect(event?.phase).toBe("note");
    }
  });
});
