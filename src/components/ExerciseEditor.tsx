import { ArrowLeft, Copy, Check, Play, Plus } from "lucide-react";
import type { Exercise, Routine, RoutineItem } from "../types";
import { instantiate } from "../types";
import { validateConfig } from "../music/notes";
import { Contour } from "./Contour";
import { ConfigEditor } from "./ConfigEditor";
import { PatternEditor } from "./PatternEditor";
interface Props {
  exercise: Exercise;
  setExercise: (exercise: Exercise) => void;
  library: { routines: Routine[] };
  duplicate: (exercise: Exercise) => void;
  begin: (items: RoutineItem[], title: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  onCreateRoutine: (exercise: Exercise) => void;
  onAddToRoutine: (routine: Routine) => void;
}
export function ExerciseEditor({
  exercise,
  setExercise,
  library,
  duplicate,
  begin,
  onClose,
  onSave,
  onCreateRoutine,
  onAddToRoutine,
}: Props) {
  return (
    <>
      <button className="text-button" onClick={() => onClose()}>
        <ArrowLeft size={18} /> Volver a ejercicios
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {exercise.builtin ? "EJERCICIO INCLUIDO" : "TU EJERCICIO"}
          </p>
          <h1>{exercise.builtin ? exercise.name : "Editar ejercicio"}</h1>
        </div>
        {exercise.builtin && (
          <button
            className="button secondary"
            onClick={() => duplicate(exercise)}
          >
            <Copy size={17} /> Crear una copia
          </button>
        )}
      </div>
      <div className="editor-layout">
        <section className="panel">
          <label>
            Nombre
            <input
              maxLength={80}
              value={exercise.name}
              disabled={exercise.builtin}
              onChange={(e) =>
                setExercise({ ...exercise, name: e.target.value })
              }
            />
          </label>
          {exercise.builtin ? (
            <div className="pattern-editor">
              <Contour pattern={exercise.pattern} />
              <p className="form-hint">
                Crea una copia para cambiar el patrón o guardar otros valores en
                el banco.
              </p>
            </div>
          ) : (
            <PatternEditor
              value={exercise.pattern}
              onChange={(pattern) => setExercise({ ...exercise, pattern })}
            />
          )}
          <ConfigEditor
            value={exercise}
            pattern={exercise.pattern}
            onChange={(config) => setExercise({ ...exercise, ...config })}
          />
          {!exercise.builtin && (
            <button
              className="button primary full-width"
              disabled={
                !exercise.name.trim() ||
                !!validateConfig(exercise, exercise.pattern)
              }
              onClick={() => void onSave()}
            >
              <Check size={18} /> Guardar ejercicio
            </button>
          )}
        </section>
        <aside className="panel action-panel">
          <h3>Llévalo a tu práctica</h3>
          <p>
            Los ajustes que añadas a una rutina serán independientes de este
            ejercicio.
          </p>
          <button
            className="button primary full-width"
            disabled={!!validateConfig(exercise, exercise.pattern)}
            onClick={() => begin([instantiate(exercise)], exercise.name)}
          >
            <Play size={17} /> Practicar ahora
          </button>
          <button
            className="button secondary full-width"
            disabled={!!validateConfig(exercise, exercise.pattern)}
            onClick={() => {
              onCreateRoutine(exercise);
            }}
          >
            <Plus size={17} /> Crear rutina con este ejercicio
          </button>
          {library.routines.length > 0 && (
            <label>
              Añadir a una rutina guardada
              <select
                value=""
                disabled={!!validateConfig(exercise, exercise.pattern)}
                onChange={(e) => {
                  const r = library.routines.find(
                    (r) => r.id === e.target.value,
                  );
                  if (r) {
                    const item = instantiate(exercise);
                    onAddToRoutine({
                      ...structuredClone(r),
                      items: [...structuredClone(r.items), item],
                    });
                  }
                }}
              >
                <option value="">Selecciona una rutina</option>
                {library.routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </aside>
      </div>
    </>
  );
}
