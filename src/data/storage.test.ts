import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { loadLibrary, saveLibrary } from "./storage";
import { instantiate } from "../types";
it("persiste rutinas, ejercicios, favoritos y ajustes sin mutar sus copias", async () => {
  const library = await loadLibrary();
  const original = library.exercises[0];
  const instance = instantiate(original);
  instance.bpm = 140;
  instance.vocalization = "RO";
  library.routines.push({
    id: "test",
    name: "Rutina local",
    items: [instance],
    updatedAt: 1,
  });
  library.exercises[0].favorite = true;
  library.settings.theme = "dark";
  await saveLibrary(library);
  const loaded = await loadLibrary();
  expect(loaded.routines[0].items[0].bpm).toBe(140);
  expect(loaded.exercises[0].bpm).toBe(85);
  expect(loaded.settings.theme).toBe("dark");
  expect(loaded.exercises[0].favorite).toBe(true);
  loaded.exercises[0].bpm = 180;
  await saveLibrary(loaded);
  expect((await loadLibrary()).routines[0].items[0].bpm).toBe(140);
});

it("migra una vez los seeds a tempos lentos sin tocar datos personalizados", async () => {
  const { openDB } = await import("idb");
  const { initialLibrary } = await import("./catalog");
  const legacy = initialLibrary();
  legacy.exercises.forEach((e) => (e.bpm = 100));
  legacy.exercises[0].favorite = true;
  legacy.exercises[1].bpm = 112;
  const custom = {
    ...structuredClone(legacy.exercises[2]),
    id: "custom",
    builtin: false,
    name: "Mi ejercicio",
  };
  legacy.exercises.push(custom);
  const instance = instantiate(legacy.exercises[0]);
  legacy.routines = [
    {
      id: "legacy-routine",
      name: "Conservar",
      items: [instance],
      updatedAt: 123,
    },
  ];
  legacy.settings.theme = "dark";
  const before = structuredClone(legacy);
  const db = await openDB("vocalia", 1);
  await db.put("library", legacy, "state");
  await db.delete("library", "catalogVersion");
  const migrated = await loadLibrary();
  const defaults = initialLibrary();
  expect(migrated.exercises[0]).toEqual({ ...before.exercises[0], bpm: 85 });
  expect(migrated.exercises[1]).toEqual(before.exercises[1]);
  for (let i = 2; i < 14; i++)
    expect(migrated.exercises[i]).toEqual({
      ...before.exercises[i],
      bpm: defaults.exercises[i].bpm,
    });
  expect(migrated.exercises.at(-1)).toEqual(custom);
  expect(migrated.routines).toEqual(before.routines);
  expect(migrated.settings).toEqual(before.settings);
  expect(await db.get("library", "catalogVersion")).toBe(2);
  expect(await db.get("library", "state")).toEqual(migrated);
  // A tempo chosen after migration must not be treated as an old default again.
  migrated.exercises[0].bpm = 100;
  await saveLibrary(migrated);
  expect(await loadLibrary()).toEqual(migrated);
  db.close();
});

it("incluye 14 tempos de 70 a 90 BPM con escalas y arpegios diferenciados", async () => {
  const { initialLibrary } = await import("./catalog");
  const { exercises } = initialLibrary();
  expect(exercises).toHaveLength(14);
  for (const e of exercises) {
    expect(e.bpm).toBeGreaterThanOrEqual(70);
    expect(e.bpm).toBeLessThanOrEqual(90);
  }
  expect(exercises[1].bpm).toBe(80);
  expect(exercises[3].bpm).toBe(75);
});
