import { useEffect, useRef, useState } from "react";
import type { SetStateAction } from "react";
import {
  AudioLines,
  Home,
  Library as LibraryIcon,
  ListMusic,
  Settings as SettingsIcon,
  Check,
  WifiOff,
} from "lucide-react";
import type { Exercise, Library, Routine, RoutineItem } from "./types";
import { instantiate } from "./types";
import { initialLibrary } from "./data/catalog";
import { loadLibrary, saveLibrary } from "./data/storage";
import { upsertRoutine } from "./data/libraryMutations";
import { validateConfig } from "./music/notes";
import { ExerciseEditor } from "./components/ExerciseEditor";
import { RoutineEditor } from "./components/RoutineEditor";
import { ExerciseCard } from "./components/ExerciseCard";
import { Player } from "./components/Player";
import { HomePage } from "./pages/HomePage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { RoutinesPage } from "./pages/RoutinesPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./styles.css";
type Page = "home" | "exercises" | "routines" | "settings";
type Session = { title: string; items: RoutineItem[] };
export default function App() {
  const [library, setLibrary] = useState<Library>(initialLibrary);
  const libraryRef = useRef(library);
  const saveQueue = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [page, setPage] = useState<Page>("home");
  const [routine, setRoutineState] = useState<Routine | null>(null);
  const routineRef = useRef<Routine | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    void loadLibrary()
      .then((data) => {
        libraryRef.current = data;
        setLibrary(data);
        setLoaded(true);
      })
      .catch(() =>
        setStorageError(
          "No se pudo abrir el almacenamiento local. Reintenta en una ventana normal del navegador.",
        ),
      );
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page, routine?.id, exercise?.id, session]);
  useEffect(() => {
    document.documentElement.dataset.theme = library.settings.theme;
  }, [library.settings.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  function setRoutine(update: SetStateAction<Routine | null>) {
    const next =
      typeof update === "function" ? update(routineRef.current) : update;
    routineRef.current = next;
    setRoutineState(next);
  }
  async function persist(update: (current: Library) => Library) {
    const next = update(libraryRef.current);
    libraryRef.current = next;
    setLibrary(next);
    try {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(() => saveLibrary(next));
      await saveQueue.current;
      setStorageError("");
      return true;
    } catch {
      setStorageError(
        "No se pudieron guardar los cambios. Comprueba el espacio disponible y vuelve a intentarlo.",
      );
      return false;
    }
  }
  function changeSettings(settings: Library["settings"]) {
    void persist((current) => ({ ...current, settings }));
  }
  function changeVolume(volumePercent: number) {
    void persist((current) => ({
      ...current,
      settings: { ...current.settings, volumePercent },
    }));
  }
  function changeMarkKeyChanges(markKeyChanges: boolean) {
    void persist((current) => ({
      ...current,
      settings: { ...current.settings, markKeyChanges },
    }));
  }
  function navigate(next: Page) {
    setPage(next);
    setRoutine(null);
    setExercise(null);
  }
  function newRoutine(seed?: Exercise) {
    const entry = seed ? instantiate(seed) : null;
    setRoutine({
      id: crypto.randomUUID(),
      name: "Mi rutina",
      items: entry ? [entry] : [],
      updatedAt: Date.now(),
    });
    setPage("routines");
  }
  function openExercise(value: Exercise) {
    setExercise(structuredClone(value));
  }
  function duplicate(value: Exercise) {
    setExercise({
      ...structuredClone(value),
      id: crypto.randomUUID(),
      builtin: false,
      favorite: false,
      name: `${value.name} · copia`,
    });
  }
  async function favorite(value: Exercise) {
    await persist((current) => ({
      ...current,
      exercises: current.exercises.map((e) =>
        e.id === value.id ? { ...e, favorite: !e.favorite } : e,
      ),
    }));
  }
  async function saveExercise() {
    if (!exercise) return;
    if (
      await persist((current) => {
        const found = current.exercises.some((e) => e.id === exercise.id);
        return {
          ...current,
          exercises: found
            ? current.exercises.map((e) =>
                e.id === exercise.id ? exercise : e,
              )
            : [...current.exercises, exercise],
        };
      })
    ) {
      setExercise(null);
      setNotice("Ejercicio guardado");
    }
  }
  async function saveRoutine() {
    const draft = routineRef.current;
    if (!draft) return;
    const error = draft.items
      .map((item) => validateConfig(item, item.pattern))
      .find(Boolean);
    if (!draft.name.trim() || !draft.items.length || error) return;
    const value = { ...draft, updatedAt: Date.now() };
    if (await persist((current) => upsertRoutine(current, value))) {
      setRoutine(null);
      setNotice("Rutina guardada en este dispositivo");
    }
  }

  function begin(items: RoutineItem[], title: string) {
    const error = items.map((i) => validateConfig(i, i.pattern)).find(Boolean);
    if (error || !items.length) {
      setNotice(error || "Añade al menos un ejercicio");
      return;
    }
    setSession({ items: structuredClone(items), title });
  }

  function card(value: Exercise, compact = false) {
    return (
      <ExerciseCard
        key={value.id}
        value={value}
        compact={compact}
        openExercise={openExercise}
        favorite={favorite}
        duplicate={duplicate}
        begin={begin}
      />
    );
  }
  if (!loaded)
    return (
      <main className="loading">
        <AudioLines size={40} />
        <h1>Dodepecho</h1>
        <p>{storageError || "Preparando tu espacio de práctica…"}</p>
        {storageError && (
          <button onClick={() => location.reload()}>Reintentar</button>
        )}
      </main>
    );
  return (
    <div className={`app-shell ${session ? "is-practicing" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSession(null);
            navigate("home");
          }}
        >
          <span className="brand-icon">
            <AudioLines size={27} />
          </span>
          Dodepecho<span className="brand-dot">.</span>
        </a>
        <span className="brand-caption">TU PIANO DE PRÁCTICA</span>
        <nav aria-label="Navegación principal">
          {(
            [
              { id: "home", label: "Inicio", icon: Home },
              { id: "exercises", label: "Ejercicios", icon: LibraryIcon },
              { id: "routines", label: "Rutinas", icon: ListMusic },
              { id: "settings", label: "Ajustes", icon: SettingsIcon },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={
                page === id && !session ? "nav-item active" : "nav-item"
              }
              onClick={() => {
                setSession(null);
                navigate(id);
              }}
            >
              <Icon size={21} />
              <span>{label}</span>
              {id === "exercises" && (
                <span className="nav-count">{library.exercises.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="local-note">
          <span className="status-dot" /> Solo en tu dispositivo
          <p>
            Tu voz, tu ritmo.
            <br />
            Sin cuentas ni conexión.
          </p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Un momento para tu voz</span>
          <span className="local-badge">
            <WifiOff size={15} /> Práctica local
          </span>
        </header>
        <main>
          {storageError && (
            <div className="error-banner" role="alert">
              {storageError}
            </div>
          )}
          {session ? (
            <Player
              {...session}
              onClose={() => setSession(null)}
              volumePercent={library.settings.volumePercent}
              onVolumeChange={changeVolume}
              markKeyChanges={library.settings.markKeyChanges}
              onMarkKeyChangesChange={changeMarkKeyChanges}
            />
          ) : exercise ? (
            <>
              <ExerciseEditor
                exercise={exercise}
                setExercise={setExercise}
                library={library}
                duplicate={duplicate}
                begin={begin}
                onClose={() => setExercise(null)}
                onSave={saveExercise}
                onCreateRoutine={(value) => {
                  newRoutine(value);
                  setExercise(null);
                }}
                onAddToRoutine={(value) => {
                  setRoutine(value);
                  setExercise(null);
                  setPage("routines");
                }}
              />
            </>
          ) : routine ? (
            <>
              <RoutineEditor
                key={routine.id}
                routine={routine}
                setRoutine={setRoutine}
                library={library}
                onClose={() => setRoutine(null)}
                onSave={saveRoutine}
              />
            </>
          ) : page === "home" ? (
            <HomePage
              library={library}
              newRoutine={newRoutine}
              navigate={navigate}
              onEditRoutine={(r) => {
                setRoutine(structuredClone(r));
                setPage("routines");
              }}
              begin={begin}
              card={card}
            />
          ) : page === "exercises" ? (
            <ExercisesPage
              library={library}
              setExercise={setExercise}
              card={card}
            />
          ) : page === "routines" ? (
            <RoutinesPage
              library={library}
              newRoutine={newRoutine}
              onEdit={(r) => setRoutine(structuredClone(r))}
              begin={begin}
            />
          ) : (
            <SettingsPage
              settings={library.settings}
              onChange={changeSettings}
            />
          )}
        </main>
        <footer>
          HECHO PARA CANTAR <span>Sin prisas. Nota a nota.</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}
