import { describe, it, expect } from "vitest";
import {
  noteToMidi,
  midiToNote,
  transpose,
  makePattern,
  patternNotes,
  successionBases,
} from "./notes";
import { initialLibrary } from "../data/catalog";
import { instantiate } from "../types";
const config = initialLibrary().exercises[4];
describe("Lógica musical", () => {
  it("convierte C4 ↔ MIDI 60", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(midiToNote(60)).toBe("C4");
  });
  it("convierte todos los MIDI sin pérdidas", () => {
    for (let i = 0; i < 128; i++) expect(noteToMidi(midiToNote(i))).toBe(i);
  });
  it("calcula arpegio desde C3", () =>
    expect(
      patternNotes(48, makePattern(["1", "3", "5", "8"])).map(midiToNote),
    ).toEqual(["C3", "E3", "G3", "C4"]));
  it("transporta cromáticamente entre octavas", () => {
    expect(midiToNote(transpose(59, 1))).toBe("C4");
    expect(midiToNote(transpose(60, -1))).toBe("B3");
  });
  it("límite C5 permite última base C4 para octava", () =>
    expect(successionBases(config, config.pattern).at(-1)).toBe(60));
  it("descenso respeta la nota más grave", () => {
    const pattern = makePattern(["5", "3", "1"]);
    expect(
      successionBases(
        { ...config, start: 60, lower: 48, direction: "down" },
        pattern,
      ).at(-1),
    ).toBe(48);
  });
  it("el límite inferior usa el mínimo desplazamiento real", () => {
    const pattern = makePattern(["3", "5"]);
    expect(
      successionBases(
        { ...config, start: 60, lower: 48, direction: "down" },
        pattern,
      ).at(-1),
    ).toBe(44);
  });
  it("ida y vuelta sin duplicar extremo", () =>
    expect(
      successionBases(
        { ...config, upper: 62, start: 48, direction: "up-down" },
        config.pattern,
      ),
    ).toEqual([48, 49, 50, 49, 48]));
  it("respeta paso y ambos límites en cada nota", () => {
    for (const direction of ["up", "down", "up-down"] as const) {
      const c = { ...config, start: 54, step: 2, direction };
      for (const base of successionBases(c, c.pattern))
        for (const note of patternNotes(base, c.pattern)) {
          expect(note).toBeGreaterThanOrEqual(c.lower);
          expect(note).toBeLessThanOrEqual(c.upper);
        }
    }
  });
  it("rechaza inicio que sale del rango", () =>
    expect(() =>
      successionBases({ ...config, start: 72 }, config.pattern),
    ).toThrow());
  it("instancias independientes del banco y de otras rutinas", () => {
    const a = instantiate(config),
      b = instantiate(config);
    a.pattern.semitones[0] = 99;
    a.bpm = 140;
    expect(b.pattern.semitones[0]).toBe(0);
    expect(config.bpm).toBe(72);
    expect(a.id).not.toBe(b.id);
  });
});
