import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import type { Exercise, Routine, RoutineItem } from "../types";
import { instantiate } from "../types";
import { midiToNote, validateConfig } from "../music/notes";
import { firstAudibleNote, rangeExtreme } from "../music/range";
import { updateRoutineItem } from "../data/libraryMutations";
import { Contour } from "./Contour";
import { ConfigEditor } from "./ConfigEditor";
interface Props {
  routine: Routine;
  setRoutine: Dispatch<SetStateAction<Routine | null>>;
  library: { exercises: Exercise[] };
  onClose: () => void;
  onSave: () => Promise<void>;
}
export function RoutineEditor({
  routine,
  setRoutine,
  library,
  onClose,
  onSave,
}: Props) {
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(
    routine.items.at(-1)?.id ?? null,
  );
  const routineValid =
    routine.name.trim() &&
    routine.items.length > 0 &&
    routine.items.every((i) => !validateConfig(i, i.pattern));
  function editItem(id: string, update: (item: RoutineItem) => RoutineItem) {
    setRoutine((current) =>
      current ? updateRoutineItem(current, id, update) : current,
    );
  }
  function moveItem(id: string, delta: number) {
    setRoutine((current) => {
      if (!current) return current;
      const index = current.items.findIndex((item) => item.id === id);
      if (
        index < 0 ||
        index + delta < 0 ||
        index + delta >= current.items.length
      )
        return current;
      const items = [...current.items];
      [items[index], items[index + delta]] = [
        items[index + delta],
        items[index],
      ];
      return { ...current, items };
    });
  }
  return (
    <>
      <button className="text-button" onClick={onClose}>
        <ArrowLeft size={18} /> Volver a rutinas
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PREPARA TU PRÁCTICA</p>
          <h1>Editar rutina</h1>
        </div>
        <button
          className="button primary"
          disabled={!routineValid}
          onClick={() => void onSave()}
        >
          <Check size={18} /> Guardar rutina
        </button>
      </div>
      <section className="routine-name panel">
        <label>
          Nombre de la rutina
          <input
            value={routine.name}
            maxLength={80}
            onChange={(e) => {
              const name = e.target.value;
              setRoutine((current) => current && { ...current, name });
            }}
          />
        </label>
        <p className="form-hint">
          Cada ejercicio conserva sus propios ajustes. El banco no se modifica.
        </p>
      </section>
      <div className="routine-items">
        {routine.items.map((item, i) => (
          <section className="routine-item panel" key={item.id}>
            <div className="routine-item-head">
              <span className="item-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                className="item-title"
                onClick={() =>
                  setExpanded(expanded === item.id ? null : item.id)
                }
                aria-expanded={expanded === item.id}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.vocalization} · {item.bpm} BPM ·{" "}
                  {midiToNote(firstAudibleNote(item, item.pattern))}–
                  {midiToNote(rangeExtreme(item))}
                </span>
              </button>
              <div className="item-tools">
                <button
                  className="icon-button small-button"
                  aria-label={`Subir ${item.name}`}
                  disabled={i === 0}
                  onClick={() => moveItem(item.id, -1)}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  className="icon-button small-button"
                  aria-label={`Bajar ${item.name}`}
                  disabled={i === routine.items.length - 1}
                  onClick={() => moveItem(item.id, 1)}
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  className="icon-button small-button"
                  aria-label={`Duplicar instancia ${item.name}`}
                  onClick={() => {
                    const copy = {
                      ...structuredClone(item),
                      id: crypto.randomUUID(),
                    };
                    setRoutine((current) => {
                      if (!current) return current;
                      const items = [...current.items];
                      const index = items.findIndex(
                        (entry) => entry.id === item.id,
                      );
                      if (index < 0) return current;
                      items.splice(index + 1, 0, copy);
                      return { ...current, items };
                    });
                  }}
                >
                  <Copy size={17} />
                </button>
                <button
                  className="icon-button small-button"
                  aria-label={`Eliminar ${item.name} de rutina`}
                  onClick={() =>
                    setRoutine(
                      (current) =>
                        current && {
                          ...current,
                          items: current.items.filter(
                            (entry) => entry.id !== item.id,
                          ),
                        },
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            {expanded === item.id && (
              <div className="instance-config">
                <Contour pattern={item.pattern} />
                <ConfigEditor
                  value={item}
                  pattern={item.pattern}
                  onChange={(update) =>
                    editItem(item.id, (current) => ({
                      ...current,
                      ...update(current),
                    }))
                  }
                />
              </div>
            )}
          </section>
        ))}
      </div>
      <button
        className="add-exercise"
        onClick={() => {
          setPicker(!picker);
        }}
      >
        {picker ? <X size={19} /> : <Plus size={19} />}{" "}
        {picker ? "Cerrar banco" : "Añadir ejercicio del banco"}
      </button>
      {picker && (
        <section className="picker">
          <div className="section-line">
            <h2>Elige un ejercicio</h2>
            <span>Puedes añadirlo varias veces</span>
          </div>
          <div className="exercise-grid">
            {library.exercises.map((e) => (
              <button
                key={e.id}
                className="picker-card"
                onClick={() => {
                  const item = instantiate(e);
                  setRoutine(
                    (current) =>
                      current && {
                        ...current,
                        items: [...current.items, item],
                      },
                  );
                  setExpanded(item.id);
                  setPicker(false);
                }}
              >
                <div>
                  <strong>{e.name}</strong>
                  <span>
                    {e.vocalization} · {e.bpm} BPM
                  </span>
                </div>
                <Plus size={20} />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
