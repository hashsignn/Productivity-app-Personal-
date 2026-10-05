import { useApp } from "./AppContext";
import { close, minimize } from "../lib/windowControls";
import type { WindowMode } from "../lib/settings";

const MODES: { mode: WindowMode; icon: string; label: string }[] = [
  { mode: "normal", icon: "◻︎", label: "Normal window" },
  { mode: "top", icon: "📌", label: "Pinned on top" },
  { mode: "desktop", icon: "🖥", label: "Stuck to desktop" },
];

export default function TitleBar({ onSettings }: { onSettings: () => void }) {
  const { settings, updateSettings } = useApp();
  const i = MODES.findIndex((m) => m.mode === settings.windowMode);
  const mode = MODES[i < 0 ? 0 : i];
  const nextMode = MODES[(i + 1) % MODES.length];

  return (
    <header className="titlebar" data-tauri-drag-region>
      <span className="app-name" data-tauri-drag-region>
        Glass Planner
      </span>
      <div className="title-actions">
        <button
          className="icon-btn"
          title={`${mode.label}. Click for: ${nextMode.label}`}
          onClick={() => updateSettings({ windowMode: nextMode.mode })}
        >
          {mode.icon}
        </button>
        <button className="icon-btn" title="Appearance" onClick={onSettings}>
          ⚙︎
        </button>
        <button className="icon-btn" title="Minimize" onClick={minimize}>
          –
        </button>
        <button className="icon-btn close" title="Close" onClick={close}>
          ✕
        </button>
      </div>
    </header>
  );
}
