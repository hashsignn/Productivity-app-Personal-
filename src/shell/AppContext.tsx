import { createContext, useContext } from "react";
import type { Settings } from "../lib/settings";

export interface AppState {
  /** Day the user is looking at, "YYYY-MM-DD". Panels follow it. */
  date: string;
  setDate: (date: string) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Opens a registered panel by its folder name, e.g. openFeature("study"). */
  openFeature: (id: string) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside the app shell");
  return ctx;
}
