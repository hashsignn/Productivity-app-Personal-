// Pure Pomodoro state machine. Time is tracked as an absolute end timestamp
// while running, so the timer stays accurate if the app is throttled,
// minimised, or restarted mid-session.

export type Phase = "focus" | "short" | "long";

export interface TimerSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  /** Take a long break after this many focus sessions. */
  longEvery: number;
  /** Start the next phase automatically when one ends. */
  autoStart: boolean;
  sound: boolean;
}

export interface TimerState {
  phase: Phase;
  running: boolean;
  /** Epoch ms when the current phase ends; only set while running. */
  endsAt: number | null;
  /** Time left when paused/idle. */
  remainingMs: number;
  /** Focus sessions finished in the current set (resets after a long break). */
  cycle: number;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  sound: true,
};

export const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

export function durationMs(phase: Phase, s: TimerSettings): number {
  const min = phase === "focus" ? s.focusMin : phase === "short" ? s.shortMin : s.longMin;
  return Math.max(1, min) * 60_000;
}

export function initialState(s: TimerSettings): TimerState {
  return { phase: "focus", running: false, endsAt: null, remainingMs: durationMs("focus", s), cycle: 0 };
}

export function remaining(t: TimerState, now: number): number {
  if (t.running && t.endsAt !== null) return Math.max(0, t.endsAt - now);
  return t.remainingMs;
}

export function start(t: TimerState, now: number): TimerState {
  if (t.running) return t;
  return { ...t, running: true, endsAt: now + t.remainingMs };
}

export function pause(t: TimerState, now: number): TimerState {
  if (!t.running) return t;
  return { ...t, running: false, endsAt: null, remainingMs: remaining(t, now) };
}

export function reset(t: TimerState, s: TimerSettings): TimerState {
  return { ...t, running: false, endsAt: null, remainingMs: durationMs(t.phase, s) };
}

/** Jump to a phase, stopped, with its full duration. */
export function setPhase(t: TimerState, phase: Phase, s: TimerSettings): TimerState {
  return { ...t, phase, running: false, endsAt: null, remainingMs: durationMs(phase, s) };
}

function following(t: TimerState, s: TimerSettings, countedFocus: boolean): { phase: Phase; cycle: number } {
  if (t.phase !== "focus") return { phase: "focus", cycle: t.phase === "long" ? 0 : t.cycle };
  const cycle = countedFocus ? t.cycle + 1 : t.cycle;
  return { phase: cycle >= s.longEvery ? "long" : "short", cycle };
}

function enter(phase: Phase, cycle: number, s: TimerSettings, now: number, run: boolean): TimerState {
  const ms = durationMs(phase, s);
  return { phase, cycle, running: run, endsAt: run ? now + ms : null, remainingMs: ms };
}

/** The current phase ran out. Returns the next state and whether a focus session was completed. */
export function complete(t: TimerState, s: TimerSettings, now: number): { state: TimerState; finishedFocus: boolean } {
  const finishedFocus = t.phase === "focus";
  const next = following(t, s, finishedFocus);
  return { state: enter(next.phase, next.cycle, s, now, s.autoStart), finishedFocus };
}

/** Move on without counting the current phase as done. */
export function skip(t: TimerState, s: TimerSettings, now: number): TimerState {
  const next = following(t, s, false);
  return enter(next.phase, next.cycle, s, now, t.running);
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
