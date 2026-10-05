import type { ExerciseConfig, Pattern } from "../types";
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE = [0, 2, 4, 5, 7, 9, 11];
export function noteToMidi(note: string): number {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(note);
  if (!match) throw new Error("Nota no válida");
  const pitchClass = NAMES.indexOf(match[1] + match[2]);
  if (pitchClass < 0) throw new Error("Nota no válida");
  const value = (Number(match[3]) + 1) * 12 + pitchClass;
  if (value < 0 || value > 127) throw new Error("Nota fuera de rango MIDI");
  return value;
}
export function midiToNote(midi: number): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127)
    throw new Error("Nota fuera de rango MIDI");
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
export function transpose(note: number, semitones: number): number {
  const result = note + semitones;
  midiToNote(result);
  return result;
}
export function degreeToSemitones(degree: string): number {
  const match = /^([♭♯]?)([1-9]|1[0-5])$/.exec(degree);
  if (!match) throw new Error("Grado no válido");
  const d = Number(match[2]) - 1;
  return (
    SCALE[d % 7] +
    Math.floor(d / 7) * 12 +
    (match[1] === "♭" ? -1 : match[1] === "♯" ? 1 : 0)
  );
}
export function makePattern(degrees: string[]): Pattern {
  return { degrees: [...degrees], semitones: degrees.map(degreeToSemitones) };
}
export function patternNotes(base: number, pattern: Pattern): number[] {
  return pattern.semitones.map((offset) => transpose(base, offset));
}
export function baseLimits(pattern: Pattern, lower: number, upper: number) {
  if (!pattern.semitones.length)
    throw new Error("Añade al menos una nota al patrón.");
  return {
    min: lower - Math.min(...pattern.semitones),
    max: upper - Math.max(...pattern.semitones),
  };
}
export function validateConfig(
  config: ExerciseConfig,
  pattern: Pattern,
): string | null {
  if (
    !pattern.semitones.length ||
    pattern.semitones.length !== pattern.degrees.length ||
    pattern.semitones.some((n) => !Number.isInteger(n))
  )
    return "El patrón debe contener notas válidas.";
  if (!Number.isFinite(config.bpm) || config.bpm < 30 || config.bpm > 240)
    return "El tempo debe estar entre 30 y 240 BPM.";
  if (!Number.isInteger(config.step) || config.step < 1 || config.step > 12)
    return "El paso debe ser de 1 a 12 semitonos.";
  if (
    ![config.lower, config.upper, config.start].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 127,
    )
  )
    return "Selecciona notas válidas.";
  if (config.lower > config.upper)
    return "El límite inferior debe ser menor o igual que el superior.";
  if (
    !Number.isFinite(config.pauseBeats) ||
    config.pauseBeats < 0 ||
    config.pauseBeats > 16
  )
    return "La pausa debe ser de 0 a 16 tiempos.";
  if (![0.25, 0.5, 1, 2].includes(config.noteBeats))
    return "Selecciona una duración rítmica válida.";
  if (
    !Number.isFinite(config.articulation) ||
    config.articulation < 0.2 ||
    config.articulation > 1
  )
    return "La articulación debe estar entre 20 % y 100 %.";
  const { min, max } = baseLimits(pattern, config.lower, config.upper);
  if (config.start < min || config.start > max)
    return "El patrón desde la base inicial sale del rango. Ajusta el inicio o los límites.";
  return null;
}
export function successionBases(
  config: ExerciseConfig,
  pattern: Pattern,
): number[] {
  const error = validateConfig(config, pattern);
  if (error) throw new Error(error);
  const { min, max } = baseLimits(pattern, config.lower, config.upper);
  const bases: number[] = [];
  if (config.direction === "down") {
    for (let base = config.start; base >= min; base -= config.step)
      bases.push(base);
  } else {
    for (let base = config.start; base <= max; base += config.step)
      bases.push(base);
    if (config.direction === "up-down")
      bases.push(...bases.slice(0, -1).reverse());
  }
  return bases;
}
export function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
