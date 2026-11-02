import { open } from "@tauri-apps/plugin-dialog";
import { useApp } from "./AppContext";
import Sheet from "./Sheet";
import { inTauri } from "../lib/backend";
import { DEFAULT_SETTINGS, storeWallpaper, type GlassEffect, type WindowMode } from "../lib/settings";

const ACCENTS: [string, string][] = [
  ["#7cc4ff", "Sky"],
  ["#8a7dff", "Iris"],
  ["#ff8fc8", "Blossom"],
  ["#4fd1a5", "Mint"],
  ["#ffb86b", "Apricot"],
  ["#ffffff", "White"],
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? "on" : ""} aria-pressed={v === value} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useApp();

  async function pickWallpaper() {
    if (!inTauri) return;
    const path = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }],
    });
    if (typeof path === "string") updateSettings({ wallpaper: await storeWallpaper(path) });
  }

  const slider = (key: "wallpaperOpacity" | "glassOpacity" | "wallpaperBlur", max = 1, step = 0.01) => (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={settings[key]}
      onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
    />
  );

  // Each choice carries a one-line explanation so nothing has to be tried to be understood.
  const hint = (text: string) => <small className="field-hint">{text}</small>;

  return (
    <Sheet title="Appearance" onClose={onClose}>
      <h3 className="sheet-section">Look</h3>
      <div className="field" role="group" aria-label="Text color">
        <span>Text color</span>
        <Segmented
          value={settings.theme}
          options={[
            ["dark", "White text"],
            ["light", "Black text"],
          ]}
          onChange={(theme) => updateSettings({ theme })}
        />
        {hint("Pick black text if your wallpaper or desktop is bright.")}
      </div>
      <div className="field" role="group" aria-label="Accent color">
        <span>Accent color</span>
        <div className="row">
          {ACCENTS.map(([c, name]) => (
            <button
              key={c}
              className={`swatch ${settings.accent === c ? "on" : ""}`}
              style={{ background: c }}
              onClick={() => updateSettings({ accent: c })}
              title={name}
              aria-label={`${name} accent`}
              aria-pressed={settings.accent === c}
            />
          ))}
        </div>
      </div>
      <label className="field">
        <span>Card frost</span>
        {slider("glassOpacity", 0.6)}
        {hint("More frost makes the cards easier to read over busy backgrounds.")}
      </label>

      <h3 className="sheet-section">Background</h3>
      <div className="field" role="group" aria-label="Wallpaper">
        <span>Wallpaper</span>
        <div className="row">
          <button className="btn" onClick={pickWallpaper}>
            {settings.wallpaper ? "Change image" : "Choose image"}
          </button>
          {settings.wallpaper && (
            <button className="btn ghost" onClick={() => updateSettings({ wallpaper: undefined })}>
              Remove
            </button>
          )}
        </div>
      </div>
      {settings.wallpaper && (
        <>
          <label className="field">
            <span>Wallpaper visibility</span>
            {slider("wallpaperOpacity")}
            {hint("Lower lets your desktop show through.")}
          </label>
          <label className="field">
            <span>Wallpaper blur</span>
            {slider("wallpaperBlur", 40, 1)}
          </label>
        </>
      )}
      <div className="field" role="group" aria-label="Window see-through">
        <span>Window see-through</span>
        <Segmented<GlassEffect>
          value={settings.effect}
          options={[
            ["acrylic", "Blurred desktop"],
            ["mica", "Tinted"],
            ["none", "Solid"],
          ]}
          onChange={(effect) => updateSettings({ effect })}
        />
      </div>

      <h3 className="sheet-section">Window</h3>
      <div className="field" role="group" aria-label="Where the window sits">
        <span>Where the window sits</span>
        <Segmented<WindowMode>
          value={settings.windowMode}
          options={[
            ["normal", "Like any app"],
            ["top", "Always on top"],
            ["desktop", "On the desktop"],
          ]}
          onChange={(windowMode) => updateSettings({ windowMode })}
        />
        {hint(
          settings.windowMode === "desktop"
            ? "Stays behind your other windows, like a widget."
            : settings.windowMode === "top"
              ? "Floats above everything so your plan is always visible."
              : "Behaves like a normal window.",
        )}
      </div>

      <div className="row end sheet-foot">
        <button
          className="btn ghost"
          onClick={() => {
            // Colors, frost and blur only; the wallpaper and window position stay.
            const { wallpaperOpacity, wallpaperBlur, glassOpacity, theme, effect, accent } = DEFAULT_SETTINGS;
            updateSettings({ wallpaperOpacity, wallpaperBlur, glassOpacity, theme, effect, accent });
          }}
        >
          Reset look
        </button>
        <button className="btn" onClick={onClose}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
