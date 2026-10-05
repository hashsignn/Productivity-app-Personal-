import { useCallback, useEffect, useState } from "react";
import type { StudyData } from "../studyStore";
import { playChime } from "./chime";
import * as T from "./timer";

type Update = (fn: (d: StudyData) => StudyData) => void;

function logFocus(d: StudyData, minutes: number, when: Date): StudyData["focusLog"] {
  const key = T.dayKey(when);
  const prev = d.focusLog[key] ?? { sessions: 0, minutes: 0 };
  return { ...d.focusLog, [key]: { sessions: prev.sessions + 1, minutes: prev.minutes + minutes } };
}

/** Drives the timer: ticks while running, rolls phases over, logs finished focus sessions. */
export function usePomodoro(data: StudyData | null, update: Update) {
  const [now, setNow] = useState(() => Date.now());
  const running = data?.timer.state.running ?? false;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Roll over when the running phase hits zero (also covers the app being
  // closed mid-session: on load the phase is completed once, not chained).
  useEffect(() => {
    if (!data) return;
    const { state, settings } = data.timer;
    if (!state.running || T.remaining(state, now) > 0) return;
    const t = Date.now();
    update((d) => {
      const s = d.timer.state;
      if (!s.running || T.remaining(s, t) > 0) return d;
      const { state: next, finishedFocus } = T.complete(s, d.timer.settings, t);
      return {
        ...d,
        timer: { ...d.timer, state: next },
        focusLog: finishedFocus ? logFocus(d, d.timer.settings.focusMin, new Date(s.endsAt ?? t)) : d.focusLog,
      };
    });
    if (settings.sound && Date.now() - (state.endsAt ?? 0) < 60_000) {
      playChime(state.phase === "focus" ? "focus-done" : "break-done");
    }
  }, [data, now, update]);

  const act = useCallback(
    (fn: (s: T.TimerState, settings: T.TimerSettings, now: number) => T.TimerState) => {
      const t = Date.now();
      setNow(t);
      update((d) => ({ ...d, timer: { ...d.timer, state: fn(d.timer.state, d.timer.settings, t) } }));
    },
    [update],
  );

  const toggle = useCallback(() => act((s, _c, t) => (s.running ? T.pause(s, t) : T.start(s, t))), [act]);
  const reset = useCallback(() => act((s, c) => T.reset(s, c)), [act]);
  const skip = useCallback(() => act((s, c, t) => T.skip(s, c, t)), [act]);
  const setPhase = useCallback((p: T.Phase) => act((s, c) => T.setPhase(s, p, c)), [act]);

  const setSettings = useCallback(
    (patch: Partial<T.TimerSettings>) =>
      update((d) => {
        const settings = { ...d.timer.settings, ...patch };
        const s = d.timer.state;
        // An untouched, stopped timer picks up the new length straight away.
        const fresh = !s.running && s.remainingMs === T.durationMs(s.phase, d.timer.settings);
        return { ...d, timer: { settings, state: fresh ? T.reset(s, settings) : s } };
      }),
    [update],
  );

  const state = data?.timer.state;
  const settings = data?.timer.settings ?? T.DEFAULT_SETTINGS;
  const left = state ? T.remaining(state, now) : T.durationMs("focus", settings);
  const total = state ? T.durationMs(state.phase, settings) : left;
  const today = data?.focusLog[T.dayKey(new Date(now))] ?? { sessions: 0, minutes: 0 };

  return { state, settings, left, total, today, toggle, reset, skip, setPhase, setSettings };
}

export type Pomodoro = ReturnType<typeof usePomodoro>;
