export type Direction = "up" | "down" | "up-down";
export interface Pattern {
  degrees: string[];
  semitones: number[];
}
export interface ExerciseConfig {
  vocalization: string;
  bpm: number;
  noteBeats: number;
  articulation: number;
  pauseBeats: number;
  start: number;
  lower: number;
  upper: number;
  direction: Direction;
  step: number;
}
export interface Exercise extends ExerciseConfig {
  id: string;
  name: string;
  pattern: Pattern;
  favorite: boolean;
  builtin: boolean;
}
export interface RoutineItem extends ExerciseConfig {
  id: string;
  sourceId: string;
  name: string;
  pattern: Pattern;
}
export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  updatedAt: number;
}
export interface Settings {
  theme: "system" | "light" | "dark";
  volumePercent: number;
}
export interface Library {
  exercises: Exercise[];
  routines: Routine[];
  settings: Settings;
}
export function instantiate(exercise: Exercise): RoutineItem {
  const {
    id,
    favorite: _favorite,
    builtin: _builtin,
    ...config
  } = structuredClone(exercise);
  return { ...config, id: crypto.randomUUID(), sourceId: id };
}
