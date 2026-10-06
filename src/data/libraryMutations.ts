import type { Library, Routine, RoutineItem } from "../types";

export function upsertRoutine(library: Library, routine: Routine): Library {
  const found = library.routines.some((entry) => entry.id === routine.id);
  return {
    ...library,
    routines: found
      ? library.routines.map((entry) =>
          entry.id === routine.id ? routine : entry,
        )
      : [routine, ...library.routines],
  };
}

export function updateRoutineItem(
  routine: Routine,
  id: string,
  update: (item: RoutineItem) => RoutineItem,
): Routine {
  return {
    ...routine,
    items: routine.items.map((item) => (item.id === id ? update(item) : item)),
  };
}
