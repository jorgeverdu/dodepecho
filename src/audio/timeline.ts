import type { RoutineItem } from "../types";
import { PIANO_ARTICULATION } from "../music/timing";
import { successionBases, patternNotes } from "../music/notes";
export interface MusicalEvent {
  at: number;
  duration: number;
  gate: number;
  midi: number | null;
  exercise: number;
  succession: number;
  base: number;
  noteIndex: number;
  phase: "countdown" | "note" | "transition" | "rest";
  count?: number;
}
export interface Timeline {
  events: MusicalEvent[];
  duration: number;
  items: RoutineItem[];
  bases: number[][];
}
export function buildTimeline(items: RoutineItem[]): Timeline {
  if (!items.length) throw new Error("Añade un ejercicio a la rutina.");
  const events: MusicalEvent[] = [];
  let at = 0;
  const bases = items.map((item) => successionBases(item, item.pattern));
  const add = (event: Omit<MusicalEvent, "at">) => {
    events.push({ ...event, at });
    at += event.duration;
  };
  for (let count = 3; count >= 1; count--)
    add({
      duration: 1,
      gate: 0,
      midi: null,
      exercise: 0,
      succession: 0,
      base: bases[0][0],
      noteIndex: -1,
      phase: "countdown",
      count,
    });
  items.forEach((item, exercise) => {
    const beat = 60 / item.bpm;
    bases[exercise].forEach((base, succession) => {
      const common = { exercise, succession, base };
      const addPause = () => {
        if (item.pauseBeats > 0)
          add({
            ...common,
            duration: beat * item.pauseBeats,
            gate: 0,
            midi: null,
            noteIndex: -1,
            phase: "rest",
          });
      };
      if (succession > 0) {
        for (const midi of [bases[exercise][succession - 1], base])
          add({
            ...common,
            duration: beat * 0.5,
            gate: beat * 0.5 * PIANO_ARTICULATION,
            midi,
            noteIndex: -1,
            phase: "transition",
          });
        addPause();
      }
      patternNotes(base, item.pattern).forEach((midi, noteIndex) =>
        add({
          ...common,
          duration: beat * item.noteBeats,
          gate: beat * item.noteBeats * PIANO_ARTICULATION,
          midi,
          noteIndex,
          phase: "note",
        }),
      );
      addPause();
    });
  });
  return { events, duration: at, items, bases };
}
