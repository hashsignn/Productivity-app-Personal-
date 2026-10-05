import { call } from "./backend";

export type WindowMode = "normal" | "top" | "desktop";
export type GlassEffect = "acrylic" | "mica" | "none";

export interface Settings {
  /** File name of the wallpaper copy in the app data dir. */
  wallpaper?: string;
  /** 0 shows only the blurred desktop, 1 shows only the wallpaper. */
  wallpaperOpacity: number;
  /** Blur applied to the wallpaper, in px. */
  wallpaperBlur: number;
  /** How see-through the glass cards are, 0 to 1. */
  glassOpacity: number;
  theme: "dark" | "light";
  windowMode: WindowMode;
  effect: GlassEffect;
  accent: string;
}

export const DEFAULT_SETTINGS: Settings = {
  wallpaperOpacity: 0.85,
  wallpaperBlur: 0,
  glassOpacity: 0.18,
  theme: "dark",
  windowMode: "normal",
  effect: "acrylic",
  accent: "#7cc4ff",
};

export async function loadSettings(): Promise<Settings> {
  const saved = await call<Partial<Settings>>("load_settings");
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(s: Settings): Promise<void> {
  return call("save_settings", { settings: s });
}

/** Copies the image into the app data dir; returns the stored file name. */
export function storeWallpaper(filePath: string): Promise<string> {
  return call<string>("set_wallpaper", { filePath });
}
