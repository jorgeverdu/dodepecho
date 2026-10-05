import { expect, it } from "vitest";
import { parseNumericDraft } from "./NumericInput";

it("permite sustituir 80 por 90 con un estado vacío intermedio", () => {
  expect(parseNumericDraft("80")).toBe(80);
  expect(Number.isNaN(parseNumericDraft(""))).toBe(true);
  expect(parseNumericDraft("9")).toBe(9);
  expect(parseNumericDraft("90")).toBe(90);
});
