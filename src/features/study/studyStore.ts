import { useCallback, useEffect, useRef, useState } from "react";
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

// ---- storage backend -------------------------------------------------------

interface Backend {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

const localBackend: Backend = {
  async read() {
    try {
      return localStorage.getItem(`study:${FILE}`);
    } catch {
      return null;
    }
  },
  async write(text) {
    try {
      localStorage.setItem(`study:${FILE}`, text);
    } catch {
      /* storage full or unavailable: keep running in memory */
    }
  },
};

let backend: Backend = localBackend;

/** Lets the app shell point study.json at its own storage (e.g. the app data dir). */
export function setStudyBackend(b: Backend) {
  backend = b;
}

export async function loadStudy(): Promise<StudyData> {
  try {
    const text = await backend.read();
    return normalize(text ? JSON.parse(text) : null);
  } catch {
    return defaultStudyData();
  }
}

export async function saveStudy(data: StudyData): Promise<void> {
  await backend.write(JSON.stringify(data, null, 2));
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
