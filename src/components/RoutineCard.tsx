import { ListMusic, Pencil, Play } from "lucide-react";
import type { Routine } from "../types";
export function RoutineCard({
  routine,
  onEdit,
  onPlay,
}: {
  routine: Routine;
  onEdit: () => void;
  onPlay: () => void;
}) {
  return (
    <article className="routine-card">
      <span className="routine-icon">
        <ListMusic size={24} />
      </span>
      <h3>{routine.name}</h3>
      <p>
        {routine.items.length}{" "}
        {routine.items.length === 1 ? "ejercicio" : "ejercicios"} ·{" "}
        {routine.items
          .map((i) => i.vocalization)
          .slice(0, 3)
          .join(" / ")}
      </p>
      <div className="button-row">
        <button className="button secondary" onClick={onEdit}>
          <Pencil size={16} /> Editar
        </button>
        <button className="button primary" onClick={onPlay}>
          <Play size={16} fill="currentColor" /> Comenzar
        </button>
      </div>
    </article>
  );
}
