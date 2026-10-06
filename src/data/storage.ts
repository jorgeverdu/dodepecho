import { openDB } from "idb";
import type { Library } from "../types";
import { initialLibrary } from "./catalog";
import { DEFAULT_PIANO_VOLUME_PERCENT } from "../audio/volume";
const CATALOG_VERSION = 2;
const database = () =>
  openDB("vocalia", 1, {
    upgrade(db) {
      db.createObjectStore("library");
    },
  });
export async function loadLibrary(): Promise<Library> {
  const db = await database();
  try {
    const tx = db.transaction("library", "readwrite");
    const stored = (await tx.store.get("state")) as Library | undefined;
    const version =
      ((await tx.store.get("catalogVersion")) as number | undefined) ?? 1;
    let library = stored ?? initialLibrary();
    if (version < CATALOG_VERSION) {
      const defaults = new Map(
        initialLibrary().exercises.map((e) => [e.id, e.bpm]),
      );
      // Only replace legacy seed tempos; never rewrite routine snapshots or user copies.
      library = {
        ...library,
        exercises: library.exercises.map((exercise) => {
          const bpm = defaults.get(exercise.id);
          return exercise.builtin && exercise.bpm === 100 && bpm !== undefined
            ? { ...exercise, bpm }
            : exercise;
        }),
      };
      await tx.store.put(CATALOG_VERSION, "catalogVersion");
    }
    if (library.settings.volumePercent === undefined) {
      library = {
        ...library,
        settings: {
          ...library.settings,
          volumePercent: DEFAULT_PIANO_VOLUME_PERCENT,
        },
      };
    }
    if (library.settings.markKeyChanges === undefined) {
      library = {
        ...library,
        settings: { ...library.settings, markKeyChanges: true },
      };
    }
    if (
      !stored ||
      version < CATALOG_VERSION ||
      stored.settings.volumePercent === undefined ||
      stored.settings.markKeyChanges === undefined
    )
      await tx.store.put(library, "state");
    await tx.done;
    return library;
  } finally {
    db.close();
  }
}
export async function saveLibrary(library: Library): Promise<void> {
  const db = await database();
  try {
    await db.put("library", library, "state");
  } finally {
    db.close();
  }
}
