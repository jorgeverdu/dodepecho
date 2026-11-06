import type { RoutineItem } from "../types";
import { articulationGate, TRANSITION_ARTICULATION } from "../music/timing";
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
  metronomeBeats: number[];
  duration: number;
  items: RoutineItem[];
  bases: number[][];
}
export function buildTimeline(
  items: RoutineItem[],
  markKeyChanges = true,
): Timeline {
  if (!items.length) throw new Error("Añade un ejercicio a la rutina.");
  const events: MusicalEvent[] = [];
  const metronomeBeats: number[] = [];
  let at = 0;
  const bases = items.map((item) => successionBases(item, item.pattern));
  const add = (event: Omit<MusicalEvent, "at">) => {
    events.push({ ...event, at });
    at += event.duration;
  };
  items.forEach((item, exercise) => {
    const beat = 60 / item.bpm;
    for (let count = 3; count >= 1; count--)
      add({
        duration: beat,
        gate: 0,
        midi: null,
        exercise,
        succession: 0,
        base: bases[exercise][0],
        noteIndex: -1,
        phase: "countdown",
        count,
      });
    const exerciseMusicalStart = at;
    const fixedSilentGaps: { start: number; end: number }[] = [];
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
        if (markKeyChanges) {
          for (const midi of [bases[exercise][succession - 1], base])
            add({
              ...common,
              duration: beat * 0.5,
              gate: beat * 0.5 * TRANSITION_ARTICULATION,
              midi,
              noteIndex: -1,
              phase: "transition",
            });
          addPause();
        } else {
          const start = at;
          add({
            ...common,
            duration: 1,
            gate: 0,
            midi: null,
            noteIndex: -1,
            phase: "rest",
          });
          fixedSilentGaps.push({ start, end: at });
        }
        // Only the start of a new succession is quantized; its notes keep
        // their configured subdivisions and the fixed gap stays at one second.
        const beatPosition = (at - exerciseMusicalStart) / beat;
        const paddingBeats =
          Math.abs(beatPosition - Math.round(beatPosition)) < 1e-8
            ? 0
            : Math.ceil(beatPosition) - beatPosition;
        if (paddingBeats > 0)
          add({
            ...common,
            duration: paddingBeats * beat,
            gate: 0,
            midi: null,
            noteIndex: -1,
            phase: "rest",
          });
      }
      const notes = patternNotes(base, item.pattern);
      notes.forEach((midi, noteIndex) =>
        add({
          ...common,
          duration: beat * item.noteBeats,
          gate: beat * item.noteBeats * articulationGate(item.articulation),
          midi,
          noteIndex,
          phase: "note",
        }),
      );
      if (succession < bases[exercise].length - 1 && markKeyChanges) addPause();
    });
    for (let pulse = 0; exerciseMusicalStart + pulse * beat < at - 0.000001; pulse++) {
      const pulseAt = exerciseMusicalStart + pulse * beat;
      if (fixedSilentGaps.some(({ start, end }) => pulseAt >= start && pulseAt < end))
        continue;
      metronomeBeats.push(pulseAt);
    }
  });
  return { events, metronomeBeats, duration: at, items, bases };
}
