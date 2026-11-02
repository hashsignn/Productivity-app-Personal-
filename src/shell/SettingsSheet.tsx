import { open } from "@tauri-apps/plugin-dialog";
import { useApp } from "./AppContext";
import Sheet from "./Sheet";
import { inTauri } from "../lib/backend";
import { storeWallpaper, type GlassEffect, type WindowMode } from "../lib/settings";

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

  return (
    <Sheet title="Appearance" onClose={onClose}>

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
        <label className="field">
          <span>Wallpaper strength (lower shows your desktop)</span>
          {slider("wallpaperOpacity")}
        </label>
        <label className="field">
          <span>Wallpaper blur</span>
          {slider("wallpaperBlur", 40, 1)}
        </label>
        <label className="field">
          <span>Glass frost</span>
          {slider("glassOpacity", 0.6)}
        </label>
        <div className="field" role="group" aria-label="Window glass">
          <span>Window glass</span>
          <Segmented<GlassEffect>
            value={settings.effect}
            options={[
              ["acrylic", "See-through"],
              ["mica", "Mica"],
              ["none", "Off"],
            ]}
            onChange={(effect) => updateSettings({ effect })}
          />
        </div>
        <div className="field" role="group" aria-label="Window position">
          <span>Window position</span>
          <Segmented<WindowMode>
            value={settings.windowMode}
            options={[
              ["normal", "Normal"],
              ["top", "Always on top"],
              ["desktop", "On desktop"],
            ]}
            onChange={(windowMode) => updateSettings({ windowMode })}
          />
        </div>
        <div className="field" role="group" aria-label="Text">
          <span>Text</span>
          <Segmented
            value={settings.theme}
            options={[
              ["dark", "Light text"],
              ["light", "Dark text"],
            ]}
            onChange={(theme) => updateSettings({ theme })}
          />
        </div>
        <div className="field" role="group" aria-label="Accent">
          <span>Accent</span>
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
    </Sheet>
  );
}
