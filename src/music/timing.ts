export const LEGATO_ARTICULATION = 1.05;
export const STACCATO_ARTICULATION = 0.45;
export const TRANSITION_ARTICULATION = 0.88;

// Existing exercises store 0.88. Treat their former connected style as Legato
// without rewriting saved exercises or routine snapshots.
export function articulationMode(value: number): "legato" | "staccato" {
  return value >= 0.65 ? "legato" : "staccato";
}

export function articulationGate(value: number): number {
  return articulationMode(value) === "legato"
    ? LEGATO_ARTICULATION
    : STACCATO_ARTICULATION;
}

export function articulationLabel(value: number): "Legato" | "Staccato" {
  return articulationMode(value) === "legato" ? "Legato" : "Staccato";
}
