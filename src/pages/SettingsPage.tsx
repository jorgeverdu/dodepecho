import { Monitor, Sun, Moon, Check, WifiOff } from "lucide-react";
import type { Settings } from "../types";
import { PianoVolumeControl } from "../components/PianoVolumeControl";
import { MarkKeyChangesControl } from "../components/MarkKeyChangesControl";
export function SettingsPage({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU ESPACIO</p>
          <h1>Ajustes</h1>
        </div>
      </div>
      <section className="panel settings-panel">
        <h2>Apariencia</h2>
        <p>Elige cómo quieres ver tu espacio de práctica.</p>
        <div className="theme-options">
          {(
            [
              { id: "system", label: "Sistema", icon: Monitor },
              { id: "light", label: "Claro", icon: Sun },
              { id: "dark", label: "Oscuro", icon: Moon },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              className={settings.theme === id ? "selected" : ""}
              key={id}
              onClick={() => onChange({ ...settings, theme: id })}
            >
              <Icon size={22} />
              {label}
              {settings.theme === id && <Check size={16} />}
            </button>
          ))}
        </div>
      </section>
      <section className="panel settings-panel">
        <h2>Audio</h2>
        <PianoVolumeControl
          value={settings.volumePercent}
          onChange={(volumePercent) => onChange({ ...settings, volumePercent })}
        />
        <MarkKeyChangesControl
          value={settings.markKeyChanges}
          onChange={(markKeyChanges) =>
            onChange({ ...settings, markKeyChanges })
          }
        />
        <p>
          Salamander Grand Piano · Alexander Holm ·{" "}
          <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>
        </p>
      </section>
      <section className="panel settings-panel">
        <h2>Lleva Dodepecho contigo</h2>
        <p>
          En iPhone: abre la aplicación en Safari y elige Compartir → Añadir a
          pantalla de inicio. En Android o escritorio: usa «Instalar aplicación»
          en el menú del navegador.
        </p>
        <p>
          Después de la primera carga completa, puedes practicar sin conexión.
          Las rutinas y los favoritos se guardan en este navegador; borrar sus
          datos también los elimina.
        </p>
        <div className="privacy-note">
          <WifiOff size={20} />
          <span>
            Sin registro, micrófono ni datos de voz. El sonido se genera en tu
            dispositivo.
          </span>
        </div>
      </section>
    </>
  );
}
