import type { Exercise, Library } from "../types";
import { PIANO_ARTICULATION } from "../music/timing";
import { DEFAULT_PIANO_VOLUME_PERCENT } from "../audio/volume";
import { makePattern } from "../music/notes";
const definitions: [string, string, string, number][] = [
  ["Tres notas", "1 2 3 2 1", "MU", 85],
  ["Cinco notas", "1 2 3 4 5 4 3 2 1", "RO", 80],
  ["Cinco notas descendentes", "5 4 3 2 1", "MA", 80],
  ["Arpegio mayor", "1 3 5 3 1", "MI", 75],
  ["Arpegio de octava", "1 3 5 8 5 3 1", "AH", 72],
  ["Escala de octava", "1 2 3 4 5 6 7 8 7 6 5 4 3 2 1", "ME", 80],
  ["Terceras ascendentes", "1 3 2 4 3 5 4 6 5 7 6 8", "MO", 88],
  ["Terceras descendentes", "8 6 7 5 6 4 5 3 4 2 3 1", "MU", 85],
  ["Salto de quinta", "1 5 1", "NG", 75],
  ["Salto de octava", "1 8 1", "Lip trill", 70],
  ["Arpegio extendido", "1 3 5 8 10 8 5 3 1", "AH", 70],
  ["Arpegio descendente", "8 5 3 1", "MA", 75],
  ["Arpegio menor", "1 ♭3 5 8 5 ♭3 1", "ME", 72],
  ["Escala ligada", "1 2 3 4 5 4 3 2 1", "Lip trill", 85],
];
export function initialLibrary(): Library {
  const exercises: Exercise[] = definitions.map(
    ([name, degrees, vocalization, bpm], i) => ({
      id: `builtin-${i}`,
      name,
      pattern: makePattern(degrees.split(" ")),
      vocalization,
      bpm,
      noteBeats: 0.5,
      articulation: PIANO_ARTICULATION,
      pauseBeats: 2,
      start: 48,
      lower: 48,
      upper: 72,
      direction: "up",
      step: 1,
      favorite: i === 1 || i === 3,
      builtin: true,
    }),
  );
  return {
    exercises,
    routines: [],
    settings: { theme: "system", volumePercent: DEFAULT_PIANO_VOLUME_PERCENT },
  };
}
