import { useCallback, useEffect, useMemo, useState } from "react";
import { toISODate } from "./lib/date";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "./lib/settings";
import { applyEffect, applyWindowMode, growWidth } from "./lib/windowControls";
import { AppContext, type AppState } from "./shell/AppContext";
import { FEATURES } from "./shell/registry";
import TitleBar from "./shell/TitleBar";
import Wallpaper from "./shell/Wallpaper";
import SettingsSheet from "./shell/SettingsSheet";

const SIDE_PANEL_WIDTH = 520;
const mainFeatures = FEATURES.filter((f) => f.placement === "main");

export default function App() {
  const [date, setDate] = useState(toISODate());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mainId, setMainId] = useState(mainFeatures[0]?.id);
  const [sideId, setSideId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      applyWindowMode(s.windowMode).catch(console.error);
      applyEffect(s.effect).catch(console.error);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next).catch(console.error);
      if (patch.windowMode) applyWindowMode(next.windowMode).catch(console.error);
      if (patch.effect) applyEffect(next.effect).catch(console.error);
      return next;
    });
  }, []);

  const toggleSide = useCallback(
    (id: string) => {
      setSideId((cur) => {
        const next = cur === id ? null : id;
        if (!cur && next) growWidth(SIDE_PANEL_WIDTH).catch(console.error);
        if (cur && !next) growWidth(-SIDE_PANEL_WIDTH).catch(console.error);
        return next;
      });
    },
    [],
  );

  const openFeature = useCallback(
    (id: string) => {
      const f = FEATURES.find((x) => x.id === id);
      if (!f) return;
      if (f.placement === "side") {
        if (sideId !== id) toggleSide(id);
      } else setMainId(id);
    },
    [sideId, toggleSide],
  );

  const ctx: AppState = useMemo(
    () => ({ date, setDate, settings, updateSettings, openFeature }),
    [date, settings, updateSettings, openFeature],
  );

  const Main = FEATURES.find((f) => f.id === mainId)?.Component;
  const Side = FEATURES.find((f) => f.id === sideId)?.Component;

  return (
    <AppContext.Provider value={ctx}>
      <div
        className={`app theme-${settings.theme}`}
        style={
          {
            "--accent": settings.accent,
            "--glass-alpha": settings.glassOpacity,
          } as React.CSSProperties
        }
      >
        <Wallpaper />
        <TitleBar onSettings={() => setShowSettings(true)} />
        <div className="body">
          <nav className="rail glass">
            {FEATURES.map((f) => {
              const active = f.placement === "side" ? sideId === f.id : mainId === f.id;
              return (
                <button
                  key={f.id}
                  className={`rail-btn ${active ? "active" : ""}`}
                  title={f.title}
                  onClick={() => (f.placement === "side" ? toggleSide(f.id) : setMainId(f.id))}
                >
                  <span className="rail-icon">{f.icon}</span>
                  <span className="rail-label">{f.title}</span>
                </button>
              );
            })}
          </nav>
          <main className="panel">{Main && <Main />}</main>
          {Side && (
            <aside className="panel side">
              <Side />
            </aside>
          )}
        </div>
        {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
      </div>
    </AppContext.Provider>
  );
}
