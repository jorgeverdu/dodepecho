import { useState, type ReactNode } from "react";
import { Plus, Star, Search } from "lucide-react";
import type { Exercise } from "../types";
import { initialLibrary } from "../data/catalog";
import { makePattern } from "../music/notes";
export function ExercisesPage({
  library,
  setExercise,
  card,
}: {
  library: { exercises: Exercise[] };
  setExercise: (exercise: Exercise) => void;
  card: (exercise: Exercise) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const matches = library.exercises.filter(
    (e) =>
      (!favorites || e.favorite) &&
      `${e.name} ${e.vocalization}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPLORA TU VOZ</p>
          <h1>Ejercicios</h1>
          <p>Pequeños patrones. Muchas formas de practicar.</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setExercise({
              ...initialLibrary().exercises[0],
              id: crypto.randomUUID(),
              name: "Nuevo ejercicio",
              pattern: makePattern(["1"]),
              builtin: false,
              favorite: false,
            })
          }
        >
          <Plus size={18} /> Nuevo ejercicio
        </button>
      </div>
      <div className="filter-row">
        <div className="segmented">
          <button
            className={!favorites ? "selected" : ""}
            onClick={() => setFavorites(false)}
          >
            Todos <span>{library.exercises.length}</span>
          </button>
          <button
            className={favorites ? "selected" : ""}
            onClick={() => setFavorites(true)}
          >
            <Star size={16} /> Favoritos
          </button>
        </div>
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar ejercicios"
            placeholder="Buscar ejercicio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="exercise-grid">{matches.map((e) => card(e))}</div>
      {!matches.length && (
        <p className="empty-text">No hay ejercicios con estos filtros.</p>
      )}
    </>
  );
}
