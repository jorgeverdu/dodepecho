import { Undo2, Trash2 } from "lucide-react";
import type { Pattern } from "../types";
import { makePattern } from "../music/notes";
import { Contour } from "./Contour";
export function PatternEditor({
  value,
  onChange,
}: {
  value: Pattern;
  onChange: (value: Pattern) => void;
}) {
  return (
    <section className="pattern-editor">
      <div className="section-line">
        <h3>Construye tu patrón</h3>
        <span>{value.degrees.length}/32 notas</span>
      </div>
      <Contour pattern={value} />
      <p className="form-hint">Toca un grado para añadirlo a la secuencia.</p>
      <div className="degree-buttons">
        {Array.from({ length: 8 }, (_, i) => String(i + 1)).map((d) => (
          <button
            type="button"
            key={d}
            disabled={value.degrees.length >= 32}
            onClick={() => onChange(makePattern([...value.degrees, d]))}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="button-row">
        <button
          type="button"
          className="text-button"
          disabled={!value.degrees.length}
          onClick={() => onChange(makePattern(value.degrees.slice(0, -1)))}
        >
          <Undo2 size={16} /> Deshacer
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!value.degrees.length}
          onClick={() => onChange(makePattern([]))}
        >
          <Trash2 size={16} /> Vaciar
        </button>
      </div>
    </section>
  );
}
