// Thin wrappers over the Rust storage commands (src-tauri/src/storage.rs).
// Everything lives as JSON in the app data dir, one file per day.

import { convertFileSrc } from "@tauri-apps/api/core";
import { call as invoke, inTauri } from "./backend";
import type { Day, Photo } from "./types";

let dataDirCache: Promise<string> | null = null;

export function dataDir(): Promise<string> {
  dataDirCache ??= invoke<string>("data_dir");
  return dataDirCache;
}

/** Returns the saved day, or an empty one if nothing was saved for that date. */
export function loadDay(date: string): Promise<Day> {
  return invoke<Day>("load_day", { date });
}

export async function saveDay(day: Day): Promise<void> {
  await invoke("save_day", { day });
  emitDayChanged(day);
}

/** Dates ("YYYY-MM-DD") that have saved data, oldest first. */
export function listDays(): Promise<string[]> {
  return invoke<string[]>("list_days");
}

/** Loads every saved day in [from, to] (inclusive, either end optional). */
export async function loadDays(from?: string, to?: string): Promise<Day[]> {
  const dates = (await listDays()).filter(
    (d) => (!from || d >= from) && (!to || d <= to),
  );
  return Promise.all(dates.map(loadDay));
}

/** Copies the image at filePath into the app's photos folder and attaches it to the day. */
export async function addPhoto(
  date: string,
  filePath: string,
  caption?: string,
): Promise<Photo> {
  const photo = await invoke<Photo>("add_photo", { date, filePath, caption });
  emitDayChanged(await loadDay(date));
  return photo;
}

export async function deletePhoto(date: string, photoId: string): Promise<void> {
  await invoke("delete_photo", { date, photoId });
  emitDayChanged(await loadDay(date));
}

/** URL an <img> can use for a stored photo. */
export async function photoSrc(photo: Photo): Promise<string> {
  return fileSrc(`photos/${photo.fileName}`);
}

/** URL for any file stored relative to the app data dir. */
export async function fileSrc(relative: string): Promise<string> {
  if (!inTauri) return relative.replace(/^photos\//, "");
  const dir = await dataDir();
  const sep = dir.includes("\\") ? "\\" : "/";
  return convertFileSrc(`${dir}${sep}${relative.replaceAll("/", sep)}`);
}

/** Reads a panel's own JSON file in the app data dir (e.g. "study.json"); undefined if missing. */
export async function readJson<T>(name: string): Promise<T | undefined> {
  return (await invoke<T | null>("read_json_file", { name })) ?? undefined;
}

export function writeJson(name: string, data: unknown): Promise<void> {
  return invoke("write_json_file", { name, data });
}

// Panels listen for this so a change in one (ticking a task, adding a photo)
// shows up in the others without a reload.
const DAY_CHANGED = "day-changed";

function emitDayChanged(day: Day) {
  window.dispatchEvent(new CustomEvent<Day>(DAY_CHANGED, { detail: day }));
}

export function onDayChanged(fn: (day: Day) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<Day>).detail);
  window.addEventListener(DAY_CHANGED, handler);
  return () => window.removeEventListener(DAY_CHANGED, handler);
}
