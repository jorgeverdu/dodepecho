import type { ReactNode } from "react";
import {
  AudioLines,
  Plus,
  ArrowUpRight,
  ListMusic,
  ChevronRight,
} from "lucide-react";
import type { Exercise, Library, Routine, RoutineItem } from "../types";
import { RoutineCard } from "../components/RoutineCard";
interface Props {
  library: Library;
  newRoutine: () => void;
  navigate: (page: "routines" | "exercises") => void;
  onEditRoutine: (routine: Routine) => void;
  begin: (items: RoutineItem[], title: string) => void;
  card: (exercise: Exercise, compact?: boolean) => ReactNode;
}
export function HomePage({
  library,
  newRoutine,
  navigate,
  onEditRoutine,
  begin,
  card,
}: Props) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU ESPACIO DE PRÁCTICA</p>
          <h1>
            Vamos a cantar<span className="accent-dot">.</span>
          </h1>
          <p>Elige un ejercicio. Encuentra tu ritmo.</p>
        </div>
        <span className="home-decoration">
          <AudioLines size={38} />
        </span>
      </div>
      <section className="home-feature">
        <div>
          <span className="feature-label">EL PIANO TE ACOMPAÑA</span>
          <h2>
            Una nota.
            <br />
            Un paso más.
          </h2>
          <p>
            Prepara tu rutina y deja que el piano
            <br className="desktop-break" /> guíe cada cambio de tonalidad.
          </p>
          <button className="button lime" onClick={() => newRoutine()}>
            <Plus size={18} /> Crear mi rutina <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="feature-art" aria-hidden="true">
          <span className="art-note">
            C<span>3</span>
          </span>
          <svg viewBox="0 0 340 130">
            <path d="M5 110 L60 75 L115 40 L170 8 L225 40 L280 75 L335 110" />
            <g>
              {[
                [5, 110],
                [60, 75],
                [115, 40],
                [170, 8],
                [225, 40],
                [280, 75],
                [335, 110],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i === 3 ? 8 : 5} />
              ))}
            </g>
          </svg>
          <span className="art-degrees">
            1 &nbsp; 3 &nbsp; 5 &nbsp; 8 &nbsp; 5 &nbsp; 3 &nbsp; 1
          </span>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>Mis rutinas</h2>
            <p>Una práctica a tu medida.</p>
          </div>
          <button className="text-button" onClick={() => navigate("routines")}>
            Ver todas <ChevronRight size={17} />
          </button>
        </div>
        {library.routines.length ? (
          <div className="routine-grid">
            {[...library.routines]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 3)
              .map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={r}
                  onEdit={() => {
                    onEditRoutine(r);
                  }}
                  onPlay={() => begin(r.items, r.name)}
                />
              ))}
          </div>
        ) : (
          <button className="empty-routine" onClick={() => newRoutine()}>
            <span className="empty-icon">
              <ListMusic size={25} />
            </span>
            <div>
              <strong>Tu primera rutina empieza aquí</strong>
              <p>Combina ejercicios y ajusta cada uno a tu voz.</p>
            </div>
            <Plus size={22} />
          </button>
        )}
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>A mano, tus favoritos</h2>
            <p>Vuelve a los ejercicios que te sientan bien.</p>
          </div>
          <button
            className="text-button"
            onClick={() => {
              navigate("exercises");
            }}
          >
            Explorar banco <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="exercise-grid">
          {library.exercises
            .filter((e) => e.favorite)
            .slice(0, 3)
            .map((e) => card(e, true))}
        </div>
        {!library.exercises.some((e) => e.favorite) && (
          <p className="empty-text">
            Marca la estrella de un ejercicio para tenerlo aquí.
          </p>
        )}
      </section>
    </>
  );
}
