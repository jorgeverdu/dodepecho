import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import { initialLibrary } from "../data/catalog";
import { instantiate, type Direction } from "../types";
import { makePattern } from "../music/notes";
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
        const block = events.slice(i - 2, i + 3);
        expect(block.map((e) => e.phase)).toEqual([
          "note",
          "rest",
          "transition",
          "transition",
          "rest",
        ]);
        expect(block[1].duration).toBeCloseTo(pauseSeconds);
        expect(block[4].duration).toBeCloseTo(pauseSeconds);
        expect(block[1].midi).toBeNull();
        expect(block[4].midi).toBeNull();
        expect(block[2].midi).toBe(bases[0][event.succession - 1]);
        expect(block[3].midi).toBe(bases[0][event.succession]);
        expect(block[2].duration).toBeCloseTo((60 / config.bpm) * 0.5);
        expect(block[3].duration).toBeCloseTo((60 / config.bpm) * 0.5);
        const nextPattern = events.slice(i + 3).find((e) => e.phase === "note")!;
        expect(nextPattern.noteIndex).toBe(0);
        const beatPosition = (nextPattern.at - events[3].at) / (60 / config.bpm);
        expect(beatPosition).toBeCloseTo(Math.round(beatPosition), 8);
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

  it("pausa cero omite las pausas configuradas y solo añade cuantización si hace falta", () => {
    const { events } = buildTimeline([item("up", 0)]);
    const i = events.findIndex((e) => e.phase === "transition");
    expect(events.slice(i - 1, i + 2).map((e) => e.phase)).toEqual([
      "note",
      "transition",
      "transition",
    ]);
    const next = events.slice(i + 2).find((e) => e.phase === "note")!;
    const padding = events.slice(i + 2, events.indexOf(next));
    expect(padding.every((e) => e.phase === "rest" && e.duration < 60 / 80)).toBe(true);
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

describe("Notas de ataque de las sucesiones", () => {
  it.each([
    ["ascendente", {
      ...item("up"),
      pattern: makePattern(["1", "2", "3", "4", "5"]),
      upper: 56,
    }],
    ["descendente", {
      ...item("down"),
      pattern: makePattern(["5", "4", "3", "2", "1"]),
      start: 53,
      lower: 52,
      upper: 60,
    }],
    ["personalizado", {
      ...item("up"),
      pattern: makePattern(["5", "3", "1"]),
      upper: 56,
    }],
  ] as const)("transición y countdown usan la primera nota audible en %s", (_, config) => {
    const timeline = buildTimeline([config]);
    const starts = timeline.events.filter((event) =>
      event.phase === "note" && event.noteIndex === 0,
    );
    const transition = timeline.events.filter((event) => event.phase === "transition");
    expect(transition.slice(0, 2).map((event) => event.midi)).toEqual([
      starts[0].midi,
      starts[1].midi,
    ]);
    expect(transition[0].midi).toBe(timeline.bases[0][0] + config.pattern.semitones[0]);
    expect(transition[1].midi).toBe(timeline.bases[0][1] + config.pattern.semitones[0]);
    const countdown = timeline.events.slice(0, 3);
    expect(countdown[0].reference).toBeUndefined();
    expect(countdown[1].reference).toBeUndefined();
    expect(countdown[2].reference).toEqual({
      midi: starts[0].midi,
      gate: (60 / config.bpm) * 0.7,
    });
    expect(countdown[2].at + countdown[2].duration).toBeCloseTo(starts[0].at, 8);
    expect(countdown[2].at + countdown[2].reference!.gate).toBeLessThan(starts[0].at);
  });

  it("en 5-4-3-2-1 marca C4 → B3 y nunca las bases F3 → E3", () => {
    const config = {
      ...item("down"),
      pattern: makePattern(["5", "4", "3", "2", "1"]),
      start: 53,
      lower: 52,
      upper: 60,
    };
    const timeline = buildTimeline([config]);
    expect(timeline.bases[0].slice(0, 2)).toEqual([53, 52]);
    expect(timeline.events.filter((event) => event.phase === "transition").map((event) => event.midi))
      .toEqual([60, 59]);
    expect(timeline.events[2].reference?.midi).toBe(60);
  });

  it("cada ejercicio recibe su propia nota de referencia sin alargar su 3–2–1", () => {
    const first = item("up");
    const second = {
      ...item("down"),
      pattern: makePattern(["5", "4", "3", "2", "1"]),
      start: 53,
      lower: 52,
      upper: 60,
      bpm: 120,
    };
    const timeline = buildTimeline([first, second]);
    for (const [exercise, config] of [first, second].entries()) {
      const countdown = timeline.events.filter((event) =>
        event.exercise === exercise && event.phase === "countdown",
      );
      const firstNote = timeline.events.find((event) =>
        event.exercise === exercise && event.phase === "note",
      )!;
      expect(countdown[2].reference?.midi).toBe(firstNote.midi);
      expect(firstNote.at - countdown[0].at).toBeCloseTo(3 * 60 / config.bpm, 8);
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
  it.each([60, 80, 120])("3–2–1 sigue el BPM %i y enlaza con el primer ataque", (bpm) => {
    const { events, metronomeBeats } = buildTimeline([{ ...item("up"), bpm }]);
    const beat = 60 / bpm;
    const countdown = events.slice(0, 3);
    expect(countdown.map((event) => event.count)).toEqual([3, 2, 1]);
    countdown.forEach((event, index) => {
      expect(event.at).toBeCloseTo(index * beat, 8);
      expect(event.duration).toBeCloseTo(beat, 8);
    });
    const first = events.find((event) => event.phase === "note")!;
    expect(first.at).toBeCloseTo(countdown[2].at + beat, 8);
    expect(metronomeBeats[0].at).toBeCloseTo(first.at, 8);
    expect(metronomeBeats.every(({ at }) => at >= first.at - 1e-8)).toBe(true);
  });
  it("cada ejercicio utiliza su propio tempo durante la nueva cuenta atrás", () => {
    const timeline = buildTimeline([
      { ...item("up"), bpm: 80 },
      { ...item("up"), bpm: 120 },
    ]);
    for (const [exercise, bpm] of [80, 120].entries()) {
      const countdown = timeline.events.filter((event) =>
        event.exercise === exercise && event.phase === "countdown",
      );
      const first = timeline.events.find((event) =>
        event.exercise === exercise && event.phase === "note",
      )!;
      expect(countdown).toHaveLength(3);
      expect(countdown.map((event) => event.duration)).toEqual([60 / bpm, 60 / bpm, 60 / bpm]);
      expect(first.at - countdown[0].at).toBeCloseTo(3 * 60 / bpm, 8);
      expect(timeline.metronomeBeats.some(({ at }) => at === first.at)).toBe(true);
    }
  });
  it.each([70, 80, 90])("apagado: un solo segundo de pausa a %i BPM", (bpm) => {
    const { events } = buildTimeline([{ ...item("up", 4), bpm }], false);
    expect(events.some((e) => e.phase === "transition")).toBe(false);
    let fixedGaps = 0;
    for (let i = 0; i < events.length; i++) {
      if (events[i].phase !== "rest" || events[i - 1].phase !== "note") continue;
      fixedGaps++;
      expect(events[i].duration).toBe(1);
      expect(events[i - 1].phase).toBe("note");
      const next = events.slice(i + 1).find((event) => event.phase === "note")!;
      expect(
        next.at - (events[i - 1].at + events[i - 1].duration),
      ).toBeGreaterThanOrEqual(1 - 1e-8);
      const beatPosition = (next.at - events[3].at) / (60 / bpm);
      expect(beatPosition).toBeCloseTo(Math.round(beatPosition), 8);
    }
    expect(fixedGaps).toBe(events.filter((e) => e.phase === "note" && e.noteIndex === 0).length - 1);
  });
});

describe("Pulso del metrónomo", () => {
  it("clasifica patrón como fondo y pausa/transición como primer plano sin mover los beats", () => {
    const timeline = buildTimeline([{ ...item("up", 0.5), bpm: 120, noteBeats: 0.5 }]);
    const first = timeline.events.find((event) => event.phase === "note")!.at;
    timeline.metronomeBeats.forEach((pulse, index) => {
      expect(pulse.at).toBeCloseTo(first + index * 0.5, 8);
      const event = timeline.events.findLast((candidate) => candidate.at <= pulse.at + 1e-8)!;
      expect(pulse.level).toBe(event.phase === "note" ? "background" : "foreground");
    });
    expect(timeline.metronomeBeats.some((pulse) => pulse.level === "background")).toBe(true);
    expect(timeline.metronomeBeats.some((pulse) => pulse.level === "foreground" &&
      timeline.events.findLast((event) => event.at <= pulse.at + 1e-8)?.phase === "transition",
    )).toBe(true);
    expect(timeline.metronomeBeats.some((pulse) => pulse.level === "foreground" &&
      timeline.events.findLast((event) => event.at <= pulse.at + 1e-8)?.phase === "rest",
    )).toBe(true);
    const firstTransition = timeline.events.findIndex((event) => event.phase === "transition");
    const padding = timeline.events[firstTransition + 3];
    expect(padding.phase).toBe("rest");
    expect(padding.duration).toBeCloseTo(0.25);
    // Padding is shorter than one beat: the next click lands on the next pattern.
    const nextPattern = timeline.events[firstTransition + 4];
    expect(nextPattern.phase).toBe("note");
    expect(timeline.metronomeBeats.find((pulse) => Math.abs(pulse.at - nextPattern.at) < 1e-8)?.level)
      .toBe("background");
  });

  it("mantiene una rejilla por ejercicio a través de pausas y transiciones, y cambia de BPM después del nuevo 3–2–1", () => {
    const first = { ...item("up"), bpm: 80, noteBeats: 0.5 };
    const second = { ...item("up"), bpm: 110, noteBeats: 1 };
    const timeline = buildTimeline([first, second]);
    for (const [exercise, bpm] of [80, 110].entries()) {
      const start = timeline.events.find((event) => event.exercise === exercise && event.phase === "note")!.at;
      const end = timeline.events.find((event) => event.exercise === exercise + 1)?.at ?? timeline.duration;
      const beats = timeline.metronomeBeats.filter(({ at }) => at >= start && at < end);
      expect(beats[0].at).toBeCloseTo(start);
      beats.forEach(({ at }, index) => expect(at).toBeCloseTo(start + index * 60 / bpm, 8));
      expect(beats.length).toBeGreaterThan(5);
    }
    expect(timeline.metronomeBeats.some(({ at }) => timeline.events.some((event) =>
      event.exercise === 0 && event.phase === "rest" && at >= event.at - 1e-8 && at < event.at + event.duration - 1e-8,
    ))).toBe(true);
    expect(timeline.metronomeBeats.some(({ at }) => timeline.events.some((event) =>
      event.exercise === 0 && event.phase === "transition" && at >= event.at - 1e-8 && at < event.at + event.duration - 1e-8,
    ))).toBe(true);
    expect(timeline.metronomeBeats.some(({ at }) => timeline.events.some((event) =>
      event.phase === "countdown" && at >= event.at && at < event.at + event.duration,
    ))).toBe(false);
  });

  it("5 notas de medio beat acaban en 2,5 y el siguiente patrón entra en beat 5", () => {
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
    const padding = events[events.indexOf(after) + 1];
    expect(padding.phase).toBe("rest");
    expect(padding.duration).toBeCloseTo(0.5 * beat);
    expect(nextPattern.at).toBeCloseTo(start + 5 * beat);
    expect(timeline.metronomeBeats.slice(0, 6).map(({ at }) => at)).toEqual(
      Array.from({ length: 6 }, (_, n) => start + n * beat),
    );
    expect(timeline.metronomeBeats.some(({ at }) => at === nextPattern.at)).toBe(true);
  });

  it.each([
    [0.5, 0.25, 4, 0],
    [0.25, 1, 4.25, 0.75],
    [0.5, 0.5, 4.5, 0.5],
    [0.25, 1.25, 4.75, 0.25],
  ])("posición bruta %s notas / %s pausa = beat %s; añade %s beats", (noteBeats, pauseBeats, rawBeat, expectedPadding) => {
    const timeline = buildTimeline([{ ...item("up", pauseBeats), bpm: 120, noteBeats }]);
    const start = timeline.events.find((event) => event.phase === "note")!.at;
    const next = timeline.events.find((event) => event.succession === 1 && event.phase === "note")!;
    const transition = timeline.events.findIndex((event) => event.phase === "transition");
    const configuredAfter = timeline.events[transition + 2];
    const rawEnd = configuredAfter.at + configuredAfter.duration;
    expect((rawEnd - start) / 0.5).toBeCloseTo(rawBeat, 8);
    expect((next.at - rawEnd) / 0.5).toBeCloseTo(expectedPadding, 8);
    expect((next.at - start) / 0.5).toBeCloseTo(Math.ceil(rawBeat), 8);
  });

  it.each([60, 80, 120])("cuantiza cada duración por nota a %i BPM", (bpm) => {
    for (const noteBeats of [0.25, 0.5, 1, 2]) {
      const timeline = buildTimeline([{ ...item("up", 0.5), bpm, noteBeats }]);
      const first = timeline.events.find((event) => event.phase === "note")!;
      const beat = 60 / bpm;
      for (const start of timeline.events.filter((event) =>
        event.phase === "note" && event.noteIndex === 0,
      )) {
        const position = (start.at - first.at) / beat;
        expect(position).toBeCloseTo(Math.round(position), 8);
        expect(timeline.metronomeBeats.some(({ at }) => Math.abs(at - start.at) < 1e-8)).toBe(true);
      }
    }
  });

  it("no añade una pausa diminuta por error de coma flotante", () => {
    const timeline = buildTimeline([{ ...item("up", 0.25), bpm: 70, noteBeats: 0.5 }]);
    const transition = timeline.events.findIndex((event) => event.phase === "transition");
    const configuredAfter = timeline.events[transition + 2];
    const next = timeline.events[transition + 3];
    expect(configuredAfter.phase).toBe("rest");
    expect(next.phase).toBe("note");
    expect((next.at - timeline.events[3].at) / (60 / 70)).toBeCloseTo(4, 8);
  });

  it.each([60, 120])("pauseBeats sigue siendo musical a %i BPM", (bpm) => {
    for (const pauseBeats of [0.5, 1, 2]) {
      const { events } = buildTimeline([{ ...item("up", pauseBeats), bpm }]);
      const beat = 60 / bpm;
      const transitionStart = events.findIndex((event) => event.phase === "transition");
      const configuredRests = [events[transitionStart - 1], events[transitionStart + 2]];
      configuredRests.forEach((event) => {
        expect(event.phase).toBe("rest");
        expect(event.duration).toBeCloseTo(pauseBeats * beat, 8);
      });
      const transition = events.filter((event) => event.phase === "transition");
      expect(transition[0].duration).toBeCloseTo(0.5 * beat, 8);
      expect(transition[1].at - transition[0].at).toBeCloseTo(0.5 * beat, 8);
      expect(transition[1].at + transition[1].duration - transition[0].at).toBeCloseTo(beat, 8);
    }
  });

  it.each([0.25, 0.5, 1, 2])("mantiene notas subdivididas y cuantiza sucesiones con %s beats", (noteBeats) => {
    const beat = 60 / 120;
    const timeline = buildTimeline([{ ...item("up", 0.5), bpm: 120, noteBeats }]);
    const notes = timeline.events.filter((event) => event.succession === 0 && event.phase === "note");
    const start = notes[0].at;
    notes.forEach((event, index) => expect(event.at).toBeCloseTo(start + index * noteBeats * beat, 8));
    const transition = timeline.events.find((event) => event.phase === "transition")!;
    expect(transition.at).toBeCloseTo(start + (notes.length * noteBeats + 0.5) * beat, 8);
    timeline.metronomeBeats.forEach(({ at }, index) =>
      expect(at).toBeCloseTo(start + index * beat, 8),
    );
    for (const event of timeline.events.filter((event) => event.phase === "note" && event.noteIndex === 0))
      expect((event.at - start) / beat).toBeCloseTo(Math.round((event.at - start) / beat), 8);
  });

  it("sin transición, mantiene la rejilla pero calla durante el segundo fijo", () => {
    const timeline = buildTimeline([{ ...item("up"), noteBeats: 0.5 }], false);
    for (const start of timeline.events.filter((event) =>
      event.phase === "note" && event.noteIndex === 0,
    )) expect(timeline.metronomeBeats.some(({ at }) => at === start.at)).toBe(true);
    for (const { at } of timeline.metronomeBeats) {
      const event = timeline.events.find((candidate) =>
        candidate.at <= at && at < candidate.at + candidate.duration,
      );
      expect(event?.phase).toMatch(/note|rest/);
    }
    const fixed = timeline.events.find((event, index) =>
      event.phase === "rest" && timeline.events[index - 1]?.phase === "note",
    )!;
    expect(timeline.metronomeBeats.some(({ at }) => at >= fixed.at && at < fixed.at + fixed.duration)).toBe(false);
  });
});
