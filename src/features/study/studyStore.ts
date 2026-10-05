import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../../lib/storage";
import { DEFAULT_SETTINGS, initialState, type TimerSettings, type TimerState } from "./pomodoro/timer";

// Everything the study sidebar remembers lives in one file, study.json,
// separate from the day/task data owned by the to-do widget.

export type Zoom = number | "fit";

export interface RecentPdf {
  /** Stable id for a file: name + size. */
  key: string;
  name: string;
  size: number;
  lastPage: number;
  pageCount: number;
  zoom: Zoom;
  openedAt: number;
}

export interface FocusDay {
  sessions: number;
  minutes: number;
}

export interface StudyData {
  version: 1;
  tab: "timer" | "reader";
  timer: { settings: TimerSettings; state: TimerState };
  /** Finished focus sessions per local day (YYYY-MM-DD). */
  focusLog: Record<string, FocusDay>;
  /** Most recent first. */
  pdfs: RecentPdf[];
  /** The PDF that was open last, reopened on launch. */
  currentPdf: string | null;
}

export const MAX_RECENT_PDFS = 8;
const FILE = "study.json";

export function defaultStudyData(): StudyData {
  return {
    version: 1,
    tab: "timer",
    timer: { settings: { ...DEFAULT_SETTINGS }, state: initialState(DEFAULT_SETTINGS) },
    focusLog: {},
    pdfs: [],
    currentPdf: null,
  };
}

function normalize(raw: unknown): StudyData {
  const base = defaultStudyData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<StudyData>;
  const settings = { ...base.timer.settings, ...(r.timer?.settings ?? {}) };
  return {
    version: 1,
    tab: r.tab === "reader" ? "reader" : "timer",
    timer: { settings, state: { ...initialState(settings), ...(r.timer?.state ?? {}) } },
    focusLog: r.focusLog && typeof r.focusLog === "object" ? r.focusLog : {},
    pdfs: Array.isArray(r.pdfs) ? r.pdfs.slice(0, MAX_RECENT_PDFS) : [],
    currentPdf: typeof r.currentPdf === "string" ? r.currentPdf : null,
  };
}

// ---- storage ---------------------------------------------------------------

export async function loadStudy(): Promise<StudyData> {
  try {
    return normalize(await readJson<StudyData>(FILE));
  } catch {
    return defaultStudyData();
  }
}

export async function saveStudy(data: StudyData): Promise<void> {
  try {
    await writeJson(FILE, data);
  } catch {
    /* keep running in memory; the next change retries the write */
  }
}

// ---- React hook ------------------------------------------------------------

export function useStudyStore() {
  const [data, setData] = useState<StudyData | null>(null);
  const latest = useRef<StudyData | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadStudy().then((d) => {
      if (!alive) return;
      latest.current = d;
      setData(d);
    });
    const flush = () => {
      if (timer.current !== undefined && latest.current) {
        window.clearTimeout(timer.current);
        timer.current = undefined;
        void saveStudy(latest.current);
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      alive = false;
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  const update = useCallback((fn: (d: StudyData) => StudyData) => {
    if (!latest.current) return;
    const next = fn(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    setData(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      if (latest.current) void saveStudy(latest.current);
    }, 400);
  }, []);

  return { data, update };
}
