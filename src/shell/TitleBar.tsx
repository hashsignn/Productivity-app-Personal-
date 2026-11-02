import { useApp } from "./AppContext";
import { close, minimize } from "../lib/windowControls";
import type { WindowMode } from "../lib/settings";
import { Icon, type ShellIconName } from "./Icon";

const MODES: { mode: WindowMode; icon: ShellIconName; label: string }[] = [
  { mode: "normal", icon: "window", label: "Normal window" },
  { mode: "top", icon: "pin", label: "Pinned on top" },
  { mode: "desktop", icon: "desktop", label: "Stuck to desktop" },
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
          aria-label={`Window: ${mode.label}. Switch to ${nextMode.label}`}
          onClick={() => updateSettings({ windowMode: nextMode.mode })}
        >
          <Icon name={mode.icon} size={16} />
        </button>
        <button className="icon-btn" title="Appearance" aria-label="Appearance" onClick={onSettings}>
          <Icon name="settings" size={16} />
        </button>
        <button className="icon-btn" title="Minimize" aria-label="Minimize" onClick={minimize}>
          <Icon name="minimize" size={16} />
        </button>
        <button className="icon-btn close" title="Close" aria-label="Close" onClick={close}>
          <Icon name="close" size={16} />
        </button>
      </div>
    </header>
  );
}
