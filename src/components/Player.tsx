import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronsRight,
  Check,
  Music2,
} from "lucide-react";
import type { RoutineItem } from "../types";
import { midiToNote } from "../music/notes";
import {
  PianoDriver,
  PlaybackEngine,
  type PlayerSnapshot,
} from "../audio/engine";
import { buildTimeline } from "../audio/timeline";
import { Contour } from "./Contour";
import { PianoVolumeControl } from "./PianoVolumeControl";
export function Player({
  items,
  title,
  onClose,
  volumePercent,
  onVolumeChange,
}: {
  items: RoutineItem[];
  title: string;
  onClose: () => void;
  volumePercent: number;
  onVolumeChange: (value: number) => void;
}) {
  const [timeline] = useState(() => buildTimeline(items));
  const [state, setState] = useState<PlayerSnapshot>({
    status: "ready",
    event: timeline.events[0],
    elapsed: 0,
    total: timeline.duration,
  });
  const [error, setError] = useState("");
  const engine = useRef<PlaybackEngine | null>(null);
  const piano = useRef<PianoDriver | null>(null);
  useEffect(() => () => engine.current?.dispose(), []);
  useEffect(() => piano.current?.setVolume(volumePercent), [volumePercent]);
  useEffect(() => {
    if (state.status !== "playing" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined,
      cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        const acquired = await navigator.wakeLock.request("screen");
        if (cancelled) await acquired.release();
        else lock = acquired;
      } catch {
        /* Unsupported or denied: playback remains available. */
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [state.status]);
  const play = async () => {
    try {
      setError("");
      if (!engine.current) {
        piano.current = new PianoDriver(volumePercent);
        engine.current = new PlaybackEngine(timeline, piano.current, setState);
      }
      await engine.current.play();
    } catch {
      setError(
        "No se pudo activar el audio. Pulsa reproducir para intentarlo de nuevo.",
      );
    }
  };
  const seek = (exercise: number, succession: number) => {
    void engine.current
      ?.seek(exercise, succession)
      .catch(() => setError("No se pudo reanudar el audio. Pulsa continuar."));
  };
  const event = state.event,
    item = items[event.exercise],
    playing = state.status === "playing",
    complete = state.status === "complete";
  const count = playing && event.phase === "countdown";
  const progress = (state.elapsed / state.total) * 100;
  return (
    <div className="player-page">
      <button className="text-button" onClick={onClose}>
        <ArrowLeft size={18} /> Salir de la práctica
      </button>
      <div className="player-top">
        <div>
          <p className="eyebrow">TU PRÁCTICA</p>
          <h1>{title}</h1>
        </div>
        <span className="pill">
          {event.exercise + 1} / {items.length} ejercicios
        </span>
      </div>
      <div className="player-layout">
        <section className="player-stage">
          <div className="section-line">
            <span className="eyebrow">
              {complete ? "PRÁCTICA COMPLETADA" : item.name}
            </span>
            <span className="tempo">
              <Music2 size={16} />
              {item.bpm} BPM
            </span>
          </div>
          {complete ? (
            <div className="completion">
              <span className="complete-icon">
                <Check size={42} />
              </span>
              <h2>Práctica completada</h2>
              <p>Un buen momento para descansar la voz.</p>
            </div>
          ) : (
            <>
              <p className="sing-label">
                {count ? "Prepárate para cantar" : "CANTA"}
              </p>
              <h2 className="vocalization">
                {item.vocalization || "Vocalización libre"}
              </h2>
              <div
                className={`current-note ${count ? "counting" : ""}`}
                aria-live={count ? "polite" : "off"}
              >
                {count ? (
                  event.count
                ) : state.status === "ready" ? (
                  <Music2 size={48} />
                ) : event.midi !== null ? (
                  midiToNote(event.midi)
                ) : (
                  "—"
                )}
              </div>
              <div className="phase-label">
                {state.status === "ready"
                  ? "Todo listo para empezar"
                  : state.status === "paused"
                    ? "En pausa"
                    : event.phase === "transition"
                      ? "Cambio de tonalidad"
                      : event.phase === "rest"
                        ? "Pausa entre sucesiones"
                        : count
                          ? "Cuenta atrás"
                          : "Sigue el piano"}
              </div>
              <Contour
                pattern={item.pattern}
                active={
                  event.phase === "note" && state.status !== "ready"
                    ? event.noteIndex
                    : -1
                }
              />
              <div className="tonic-row">
                <span>
                  Tónica <strong>{midiToNote(event.base)}</strong>
                </span>
                <span>
                  Sucesión {event.succession + 1} de{" "}
                  {timeline.bases[event.exercise].length}
                </span>
              </div>
            </>
          )}
          <div className="transport">
            <button
              className="icon-button"
              aria-label="Sucesión anterior"
              disabled={!engine.current || complete || event.succession === 0}
              onClick={() => seek(event.exercise, event.succession - 1)}
            >
              <SkipBack />
            </button>
            <button
              className="play-button"
              onClick={() => (playing ? engine.current?.pause() : void play())}
            >
              {playing ? (
                <>
                  <Pause fill="currentColor" size={23} /> Pausa
                </>
              ) : (
                <>
                  <Play fill="currentColor" size={23} />{" "}
                  {state.status === "paused"
                    ? "Continuar"
                    : complete
                      ? "Repetir"
                      : "Comenzar"}
                </>
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Sucesión siguiente"
              disabled={
                !engine.current ||
                complete ||
                event.succession >= timeline.bases[event.exercise].length - 1
              }
              onClick={() => seek(event.exercise, event.succession + 1)}
            >
              <SkipForward />
            </button>
          </div>
          <div className="secondary-transport">
            <button
              className="text-button"
              disabled={!engine.current || complete}
              onClick={() => seek(event.exercise, 0)}
            >
              <RotateCcw size={17} /> Reiniciar ejercicio
            </button>
            <button
              className="text-button"
              disabled={
                !engine.current ||
                complete ||
                event.exercise === items.length - 1
              }
              onClick={() => seek(event.exercise + 1, 0)}
            >
              <ChevronsRight size={19} /> Siguiente ejercicio
            </button>
          </div>
          <PianoVolumeControl value={volumePercent} onChange={onVolumeChange} />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </section>
        <aside className="practice-queue">
          <p className="eyebrow">EN ESTA PRÁCTICA</p>
          {items.map((entry, i) => (
            <div
              key={entry.id}
              className={`queue-item ${i === event.exercise ? "selected" : ""}`}
            >
              <span className="queue-number">
                {i < event.exercise || complete ? (
                  <Check size={16} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>{entry.name}</strong>
                <p>
                  {entry.vocalization} · {entry.bpm} BPM
                </p>
              </div>
              {i === event.exercise && !complete && (
                <span className="live-dot" />
              )}
            </div>
          ))}
          <div className="practice-tip">
            <p>Tu espacio para cantar</p>
            <span>
              Escucha la transición del piano antes de empezar la siguiente
              tonalidad.
            </span>
          </div>
        </aside>
      </div>
      <div className="progress-section">
        <div>
          <span>Progreso de la práctica</span>
          <strong>{Math.round(progress)} %</strong>
        </div>
        <progress max="100" value={progress} aria-label="Progreso general" />
      </div>
    </div>
  );
}
