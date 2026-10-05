import { getCurrentWindow, LogicalSize, Effect } from "@tauri-apps/api/window";
import { inTauri } from "./backend";
import type { GlassEffect, WindowMode } from "./settings";

const win = () => getCurrentWindow();

export async function applyWindowMode(mode: WindowMode) {
  if (!inTauri) return;
  await win().setAlwaysOnTop(mode === "top");
  // "desktop" keeps the widget under other windows, like a desktop gadget.
  await win().setAlwaysOnBottom(mode === "desktop");
}

export async function applyEffect(effect: GlassEffect) {
  if (!inTauri) return;
  const map = { acrylic: Effect.Acrylic, mica: Effect.Mica } as const;
  if (effect === "none") await win().clearEffects();
  else await win().setEffects({ effects: [map[effect]] });
}

/** Widens (or narrows) the window by `delta` logical px. */
export async function growWidth(delta: number) {
  if (!inTauri) return;
  const w = win();
  const size = (await w.innerSize()).toLogical(await w.scaleFactor());
  await w.setSize(new LogicalSize(Math.max(360, size.width + delta), size.height));
}

export const minimize = () => inTauri && win().minimize();
export const close = () => inTauri && win().close();
