import type { ExerciseConfig, Pattern } from "../types";
import { midiToNote, successionBases, validateConfig } from "../music/notes";
const notes = Array.from({ length: 88 }, (_, i) => i + 21);
export function ConfigEditor({
  value,
  pattern,
  onChange,
}: {
  value: ExerciseConfig;
  pattern: Pattern;
  onChange: (value: ExerciseConfig) => void;
}) {
  const set = <K extends keyof ExerciseConfig>(key: K, v: ExerciseConfig[K]) =>
    onChange({ ...value, [key]: v });
  const error = validateConfig(value, pattern);
  const bases = error ? [] : successionBases(value, pattern);
  return (
    <div className="config-editor">
      <div className="form-grid">
        <label className="wide">
          Vocalización
          <input
            value={value.vocalization}
            maxLength={80}
            onChange={(e) => set("vocalization", e.target.value)}
            placeholder="RO, MA, Lip trill…"
          />
        </label>
        <label>
          Tempo · BPM
          <input
            type="number"
            min="30"
            max="240"
            value={value.bpm}
            onChange={(e) => set("bpm", Number(e.target.value))}
          />
        </label>
        <label>
          Duración por nota
          <select
            value={value.noteBeats}
            onChange={(e) => set("noteBeats", Number(e.target.value))}
          >
            <option value="0.25">Semicorchea · ¼ tiempo</option>
            <option value="0.5">Corchea · ½ tiempo</option>
            <option value="1">Negra · 1 tiempo</option>
            <option value="2">Blanca · 2 tiempos</option>
          </select>
        </label>
        {(
          [
            ["start", "Base inicial"],
            ["lower", "Nota mínima"],
            ["upper", "Nota máxima"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <select
              value={value[key]}
              onChange={(e) => set(key, Number(e.target.value))}
            >
              {notes.map((n) => (
                <option key={n} value={n}>
                  {midiToNote(n)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Dirección
          <select
            value={value.direction}
            onChange={(e) =>
              set("direction", e.target.value as ExerciseConfig["direction"])
            }
          >
            <option value="up">Ascendente</option>
            <option value="down">Descendente</option>
            <option value="up-down">Ascendente y descendente</option>
          </select>
        </label>
        <label>
          Pausa · tiempos
          <input
            type="number"
            min="0"
            max="16"
            step="0.5"
            value={value.pauseBeats}
            onChange={(e) => set("pauseBeats", Number(e.target.value))}
          />
        </label>
        <label>
          Paso · semitonos
          <input
            type="number"
            min="1"
            max="12"
            value={value.step}
            onChange={(e) => set("step", Number(e.target.value))}
          />
        </label>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="form-hint">
          {bases.length} sucesiones · bases {midiToNote(bases[0])} →{" "}
          {midiToNote(bases.at(-1)!)}. Todas las notas quedan entre{" "}
          {midiToNote(value.lower)} y {midiToNote(value.upper)}.
        </p>
      )}
    </div>
  );
}
