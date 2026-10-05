// Thin adapter between the history view and the shared storage layer.
import { open } from "@tauri-apps/plugin-dialog";
import { inTauri } from "../../lib/backend";
import { addPhoto, loadDays } from "../../lib/storage";
import type { Day, Photo, Task } from "../../lib/types";

export type { Day, Photo, Task };

export interface DaySummary {
  date: string;
  total: number;
  done: number;
  photos: number;
}

export function summarize(day: Day): DaySummary {
  return {
    date: day.date,
    total: day.tasks.length,
    done: day.tasks.filter((t) => t.done).length,
    photos: day.photos.length,
  };
}

/** Every stored day, newest first. */
export async function loadAllDays(): Promise<Day[]> {
  return (await loadDays()).sort((a, b) => b.date.localeCompare(a.date));
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"];

/** In the browser preview there is no native picker, so fall back to a file input. */
function pickInBrowser(): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => resolve([...(input.files ?? [])].map((f) => URL.createObjectURL(f)));
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

/** Opens the picker and copies the chosen images into the app's photos folder. */
export async function pickPhotos(date: string): Promise<Photo[]> {
  let paths: string[];
  if (inTauri) {
    const picked = await open({
      multiple: true,
      directory: false,
      title: "Add achievement photos",
      filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
    });
    paths = !picked ? [] : Array.isArray(picked) ? picked : [picked];
  } else {
    paths = await pickInBrowser();
  }
  const added: Photo[] = [];
  for (const path of paths) added.push(await addPhoto(date, path));
  return added;
}
