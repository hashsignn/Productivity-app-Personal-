// Routes storage calls to the Rust side, or to localStorage when the UI is
// opened in a plain browser (npm run dev) so panels can be previewed
// without building the desktop app.

import { invoke } from "@tauri-apps/api/core";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function call<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  return inTauri ? invoke<T>(cmd, args) : Promise.resolve(mock(cmd, args) as T);
}

const KEY = "glass-planner-mock:";

function get(key: string): unknown {
  const raw = localStorage.getItem(KEY + key);
  return raw ? JSON.parse(raw) : undefined;
}

function set(key: string, value: unknown) {
  localStorage.setItem(KEY + key, JSON.stringify(value));
}

function mock(cmd: string, a: Record<string, unknown>): unknown {
  switch (cmd) {
    case "data_dir":
      return "/mock";
    case "load_day":
      return get(`day:${a.date}`) ?? { date: a.date, tasks: [], photos: [] };
    case "save_day":
      set(`day:${(a.day as { date: string }).date}`, a.day);
      return null;
    case "list_days":
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(KEY + "day:"))
        .map((k) => k.slice((KEY + "day:").length))
        .sort();
    case "load_settings":
      return get("settings") ?? {};
    case "save_settings":
      set("settings", a.settings);
      return null;
    case "add_photo": {
      const day = (get(`day:${a.date}`) ?? { date: a.date, tasks: [], photos: [] }) as {
        photos: unknown[];
      };
      const photo = {
        id: crypto.randomUUID(),
        fileName: String(a.filePath),
        caption: a.caption,
        addedAt: new Date().toISOString(),
      };
      day.photos.push(photo);
      set(`day:${a.date}`, day);
      return photo;
    }
    case "delete_photo": {
      const day = get(`day:${a.date}`) as { photos: { id: string }[] } | undefined;
      if (day) {
        day.photos = day.photos.filter((p) => p.id !== a.photoId);
        set(`day:${a.date}`, day);
      }
      return null;
    }
    case "read_json_file":
      return get(`file:${a.name}`) ?? null;
    case "write_json_file":
      set(`file:${a.name}`, a.data);
      return null;
    case "set_wallpaper":
      return String(a.filePath);
    default:
      throw new Error(`no browser mock for ${cmd}`);
  }
}
