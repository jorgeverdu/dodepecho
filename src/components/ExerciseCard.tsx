import { Star, Copy, Plus, Play } from "lucide-react";
import type { Exercise, RoutineItem } from "../types";
import { instantiate } from "../types";
import { midiToNote } from "../music/notes";
import { Contour } from "./Contour";
export interface ExerciseActions {
  openExercise: (value: Exercise) => void;
  favorite: (value: Exercise) => Promise<void>;
  duplicate: (value: Exercise) => void;
  begin: (items: RoutineItem[], title: string) => void;
}
export function ExerciseCard({
  value,
  compact = false,
  openExercise,
  favorite,
  duplicate,
  begin,
}: ExerciseActions & { value: Exercise; compact?: boolean }) {
  return (
    <article
      className={`exercise-card ${compact ? "compact" : ""}`}
      key={value.id}
    >
      <div className="section-line">
        <span className="category">
          {value.pattern.semitones.length} NOTAS ·{" "}
          {value.builtin ? "INCLUIDO" : "PERSONAL"}
        </span>
        <button
          className={`star-button ${value.favorite ? "is-favorite" : ""}`}
          aria-label={`${value.favorite ? "Quitar" : "Marcar"} favorito: ${value.name}`}
          aria-pressed={value.favorite}
          onClick={() => void favorite(value)}
        >
          <Star size={19} fill={value.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="card-main" onClick={() => openExercise(value)}>
        <h3>{value.name}</h3>
        <p className="vowel-meta">
          {value.vocalization} <span>· {value.bpm} BPM</span>
        </p>
        <Contour pattern={value.pattern} small />
        <p className="pattern-text">{value.pattern.degrees.join(" – ")}</p>
      </button>
      <div className="card-bottom">
        <span>
          {midiToNote(value.lower)} — {midiToNote(value.upper)}
        </span>
        <div>
          <button
            className="icon-button small-button"
            aria-label={`Duplicar ${value.name}`}
            onClick={() => duplicate(value)}
          >
            <Copy size={17} />
          </button>
          <button
            className="icon-button small-button"
            aria-label={`Añadir ${value.name} a una rutina`}
            onClick={() => openExercise(value)}
          >
            <Plus size={19} />
          </button>
          <button
            className="mini-play"
            aria-label={`Practicar ${value.name}`}
            onClick={() => begin([instantiate(value)], value.name)}
          >
            <Play size={15} fill="currentColor" />
          </button>
        </div>
      </div>
    </article>
  );
}
