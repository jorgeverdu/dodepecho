import { Plus, ListMusic } from "lucide-react";
import type { Routine, RoutineItem } from "../types";
import { RoutineCard } from "../components/RoutineCard";
export function RoutinesPage({
  library,
  newRoutine,
  onEdit,
  begin,
}: {
  library: { routines: Routine[] };
  newRoutine: () => void;
  onEdit: (r: Routine) => void;
  begin: (items: RoutineItem[], title: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A TU RITMO</p>
          <h1>Mis rutinas</h1>
          <p>Tu secuencia, con los ajustes que necesitas.</p>
        </div>
        <button className="button primary" onClick={() => newRoutine()}>
          <Plus size={18} /> Crear rutina
        </button>
      </div>
      {library.routines.length ? (
        <div className="routine-grid">
          {library.routines.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              onEdit={() => onEdit(r)}
              onPlay={() => begin(r.items, r.name)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ListMusic size={42} />
          <h2>Prepara tu primera rutina</h2>
          <p>
            Añade ejercicios del banco y personaliza su rango, tempo y
            vocalización.
          </p>
          <button className="button primary" onClick={() => newRoutine()}>
            <Plus size={18} /> Crear rutina
          </button>
        </div>
      )}
    </>
  );
}
