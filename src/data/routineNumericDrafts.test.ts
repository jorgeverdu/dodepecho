import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { initialLibrary } from "./catalog";
import { applyRoutineNumericDrafts } from "./routineNumericDrafts";
import { loadLibrary, saveLibrary } from "./storage";
import { upsertRoutine, updateRoutineItem } from "./libraryMutations";
import { instantiate } from "../types";
import { STACCATO_ARTICULATION } from "../music/timing";

it("guarda una sola vez el valor visible de BPM, Pausa y Paso con dos ejercicios y otros cambios", async () => {
  const library = initialLibrary();
  const first = instantiate(library.exercises[0]);
  const second = instantiate(library.exercises[1]);
  library.routines.push({
    id: "save-drafts",
    name: "Prueba",
    items: [first, second],
    updatedAt: 1,
  });
  await saveLibrary(library);
  let draft = structuredClone((await loadLibrary()).routines.at(-1)!);
  draft = updateRoutineItem(draft, first.id, (item) => ({
    ...item,
    articulation: STACCATO_ARTICULATION,
    vocalization: "MA",
  }));
  draft = updateRoutineItem(draft, second.id, (item) => ({
    ...item,
    noteBeats: 0.5,
  }));
  const visible = applyRoutineNumericDrafts(draft, [
    { itemId: first.id, field: "bpm", raw: "93" },
    { itemId: first.id, field: "pauseBeats", raw: "2.5" },
    { itemId: first.id, field: "step", raw: "2" },
    { itemId: second.id, field: "bpm", raw: "107" },
    { itemId: second.id, field: "pauseBeats", raw: "3" },
    { itemId: second.id, field: "step", raw: "4" },
  ]);
  const write = vi.fn(saveLibrary);
  await write(upsertRoutine(await loadLibrary(), visible));
  expect(write).toHaveBeenCalledTimes(1);
  const reopened = (await loadLibrary()).routines.find((routine) => routine.id === draft.id)!;
  expect(reopened).toEqual(visible);
  expect(reopened.items[0]).toMatchObject({
    bpm: 93, pauseBeats: 2.5, step: 2,
    articulation: STACCATO_ARTICULATION, vocalization: "MA",
  });
  expect(reopened.items[1]).toMatchObject({
    bpm: 107, pauseBeats: 3, step: 4, noteBeats: 0.5,
  });
  expect((await loadLibrary()).routines.find((routine) => routine.id === draft.id)).toEqual(visible);
});

it("conserva un campo vacío como inválido hasta guardar y no crea un cero", () => {
  const item = instantiate(initialLibrary().exercises[0]);
  const routine = { id: "empty", name: "Prueba", items: [item], updatedAt: 1 };
  const empty = applyRoutineNumericDrafts(routine, [
    { itemId: item.id, field: "bpm", raw: "" },
  ]);
  expect(Number.isNaN(empty.items[0].bpm)).toBe(true);
  expect(applyRoutineNumericDrafts(empty, [
    { itemId: item.id, field: "bpm", raw: "90" },
  ]).items[0].bpm).toBe(90);
});
