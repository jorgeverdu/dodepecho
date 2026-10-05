import { describe, expect, it } from "vitest";
import { initialLibrary } from "../data/catalog";
import { buildTimeline } from "../audio/timeline";
import { instantiate } from "../types";
import { makePattern, patternNotes, successionBases } from "./notes";
import { firstAudibleNote, withAudibleRange } from "./range";

const seed = initialLibrary().exercises[0];
const notes = (
  pattern: ReturnType<typeof makePattern>,
  first: number,
  extreme: number,
  direction: "up" | "down" | "up-down",
) => {
  const config = withAudibleRange(seed, pattern, first, extreme, direction);
  return {
    config,
    sounding: successionBases(config, pattern).flatMap((base) =>
      patternNotes(base, pattern),
    ),
  };
};

describe("rango expresado con la primera nota audible", () => {
  it("empieza en C3 si el patrón comienza en grado 1", () => {
    const pattern = makePattern(["1", "2", "3", "4", "5", "4", "3", "2", "1"]);
    const { config, sounding } = notes(pattern, 48, 72, "up");
    expect(firstAudibleNote(config, pattern)).toBe(48);
    expect(sounding[0]).toBe(48);
  });

  it("5-4-3-2-1 con primera nota C4 toca C4, nunca G4", () => {
    const pattern = makePattern(["5", "4", "3", "2", "1"]);
    const { config, sounding } = notes(pattern, 60, 48, "down");
    expect(config.start).toBe(53);
    expect(sounding[0]).toBe(60);
    expect(Math.min(...sounding)).toBe(48);
    expect(
      buildTimeline([{ ...instantiate(seed), ...config, pattern }]).events.find(
        (event) => event.phase === "note",
      )?.midi,
    ).toBe(60);
  });

  it("un patrón personalizado que no empieza en grado 1 respeta la primera nota", () => {
    const pattern = makePattern(["3", "5", "2", "1"]);
    const { config, sounding } = notes(pattern, 60, 72, "up");
    expect(config.start).toBe(56);
    expect(sounding[0]).toBe(60);
  });

  it("el arpegio nunca supera el límite superior", () => {
    const pattern = makePattern(["1", "3", "5", "8", "5", "3", "1"]);
    const { sounding } = notes(pattern, 48, 72, "up");
    expect(Math.max(...sounding)).toBe(72);
  });

  it("en ida y vuelta respeta el límite y regresa a la primera nota", () => {
    const pattern = makePattern(["1", "2", "3", "2", "1"]);
    const { config, sounding } = notes(pattern, 48, 60, "up-down");
    expect(Math.max(...sounding)).toBeLessThanOrEqual(60);
    expect(sounding.at(-pattern.semitones.length)).toBe(48);
    expect(successionBases(config, pattern).at(-1)).toBe(config.start);
  });
});
