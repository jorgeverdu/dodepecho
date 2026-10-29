import type { Routine } from "../types";
import { parseNumericDraft } from "../components/NumericInput";

export type RoutineNumericField = "bpm" | "pauseBeats" | "step";
export interface RoutineNumericDraft {
  itemId: string;
  field: RoutineNumericField;
  raw: string;
}

export function applyRoutineNumericDrafts(
  routine: Routine,
  drafts: RoutineNumericDraft[],
): Routine {
  if (!drafts.length) return routine;
  const byItem = new Map<string, Partial<Record<RoutineNumericField, number>>>();
  for (const { itemId, field, raw } of drafts) {
    const fields = byItem.get(itemId) ?? {};
    fields[field] = parseNumericDraft(raw);
    byItem.set(itemId, fields);
  }
  return {
    ...routine,
    items: routine.items.map((item) => ({
      ...item,
      ...byItem.get(item.id),
    })),
  };
}
