import type { ExerciseConfig, Pattern } from "../types";
import { midiToNote, validateConfig } from "../music/notes";
import {
  firstAudibleNote,
  rangeExtreme,
  withAudibleRange,
} from "../music/range";
import { NumericInput } from "./NumericInput";
const notes = Array.from({ length: 88 }, (_, i) => i + 21);
export function ConfigEditor({
  value,
  pattern,
  onChange,
}: {
  value: ExerciseConfig;
  pattern: Pattern;
  onChange: (update: (current: ExerciseConfig) => ExerciseConfig) => void;
}) {
  const set = <K extends keyof ExerciseConfig>(key: K, v: ExerciseConfig[K]) =>
    onChange((current) => ({ ...current, [key]: v }));
  const error = validateConfig(value, pattern);
  const first = firstAudibleNote(value, pattern);
  const extreme = rangeExtreme(value);
  const setRange = (note: number, isFirst: boolean) =>
    onChange((current) =>
      withAudibleRange(
        current,
        pattern,
        isFirst ? note : firstAudibleNote(current, pattern),
        isFirst ? rangeExtreme(current) : note,
      ),
    );
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
          <NumericInput
            min="30"
            max="240"
            inputMode="numeric"
            value={value.bpm}
            onValueChange={(number) => set("bpm", number)}
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
        <label>
          Primera nota
          <select
            value={first}
            onChange={(e) => setRange(Number(e.target.value), true)}
          >
            {notes.map((n) => (
              <option key={n} value={n}>
                {midiToNote(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {value.direction === "down" ? "Nota más grave" : "Nota más aguda"}
          <select
            value={extreme}
            onChange={(e) => setRange(Number(e.target.value), false)}
          >
            {notes.map((n) => (
              <option key={n} value={n}>
                {midiToNote(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dirección
          <select
            value={value.direction}
            onChange={(e) => {
              const direction = e.target.value as ExerciseConfig["direction"];
              onChange((current) => {
                const nextExtreme =
                  direction === "down" ? current.lower : current.upper;
                return withAudibleRange(
                  current,
                  pattern,
                  firstAudibleNote(current, pattern),
                  nextExtreme,
                  direction,
                );
              });
            }}
          >
            <option value="up">Ascendente</option>
            <option value="down">Descendente</option>
            <option value="up-down">Ascendente y descendente</option>
          </select>
        </label>
        <label>
          Pausa · tiempos
          <NumericInput
            min="0"
            max="16"
            step="0.5"
            inputMode="decimal"
            value={value.pauseBeats}
            onValueChange={(number) => set("pauseBeats", number)}
          />
        </label>
        <label>
          Paso · semitonos
          <NumericInput
            min="1"
            max="12"
            inputMode="numeric"
            value={value.step}
            onValueChange={(number) => set("step", number)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
