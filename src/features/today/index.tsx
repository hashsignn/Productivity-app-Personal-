import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../shell/AppContext";
import type { FeatureMeta } from "../../shell/registry";
import type { Day, Task } from "../../lib/types";
import { loadDay, onDayChanged, saveDay } from "../../lib/storage";
import { addDays, durationMinutes, formatLongDate, formatTime, newId, toISODate, toMinutes } from "../../lib/date";
import { categoryOf, parseLine } from "../../lib/parser";
import ProgressRing from "./ProgressRing";
import PasteSheet from "./PasteSheet";

export const meta: FeatureMeta = { title: "Today", icon: "✓", order: 0 };

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isCurrent(t: Task, now: number): boolean {
  if (!t.start) return false;
  const s = toMinutes(t.start);
  const e = s + Math.max(durationMinutes(t.start, t.end), 1);
  return (now >= s && now < e) || (e > 1440 && now < e - 1440);
}

/** Inserts a timed task before the first task that starts later. */
function insertByTime(tasks: Task[], task: Task): Task[] {
  if (!task.start) return [...tasks, task];
  const i = tasks.findIndex((t) => t.start && t.start > task.start!);
  return i < 0 ? [...tasks, task] : [...tasks.slice(0, i), task, ...tasks.slice(i)];
}

export default function Today() {
  const { date, setDate } = useApp();
  const [day, setDay] = useState<Day | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [now, setNow] = useState(nowMinutes());
  const isToday = date === toISODate();
  const dateRef = useRef(date);
  dateRef.current = date;

  useEffect(() => {
    let live = true;
    loadDay(date).then((d) => live && setDay(d));
    return () => {
      live = false;
    };
  }, [date]);

  useEffect(() => onDayChanged((d) => d.date === dateRef.current && setDay(d)), []);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const update = useCallback((fn: (d: Day) => Day) => {
    setDay((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveDay(next).catch(console.error);
      return next;
    });
  }, []);

  const setTasks = (fn: (tasks: Task[]) => Task[]) => update((d) => ({ ...d, tasks: fn(d.tasks) }));

  const toggle = (id: string) =>
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, done: !t.done, doneAt: t.done ? undefined : new Date().toISOString() } : t,
      ),
    );

  const addTask = () => {
    const task = parseLine(draft);
    if (!task) return;
    setTasks((ts) => insertByTime(ts, task));
    setDraft("");
  };

  const rename = (id: string, title: string) => {
    setEditing(null);
    if (!title.trim()) return;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title: title.trim() } : t)));
  };

  const repeatYesterday = async () => {
    const prev = await loadDay(addDays(date, -1));
    const copied = prev.tasks.map((t) => ({ ...t, id: newId(), done: false, doneAt: undefined }));
    setTasks((ts) => [...ts, ...copied]);
  };

  const stats = useMemo(() => {
    const tasks = day?.tasks ?? [];
    const done = tasks.filter((t) => t.done).length;
    const current = isToday ? tasks.find((t) => isCurrent(t, now)) : undefined;
    const next = isToday
      ? tasks.find((t) => !t.done && t.start && toMinutes(t.start) > now)
      : undefined;
    return { done, total: tasks.length, current, next };
  }, [day, now, isToday]);

  if (!day) return null;

  return (
    <div className="today">
      <section className="glass card hero">
        <ProgressRing value={stats.total ? stats.done / stats.total : 0} />
        <div className="hero-text">
          <div className="date-nav">
            <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} title="Previous day">
              ‹
            </button>
            <h1>{isToday ? "Today" : formatLongDate(date)}</h1>
            <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} title="Next day">
              ›
            </button>
            {!isToday && (
              <button className="chip" onClick={() => setDate(toISODate())}>
                Today
              </button>
            )}
          </div>
          <p className="muted">
            {isToday ? formatLongDate(date) + " · " : ""}
            {stats.done} of {stats.total} done
          </p>
          {stats.current ? (
            <p className="now">
              <span className="pulse" /> Now: {stats.current.title}
            </p>
          ) : stats.next ? (
            <p className="muted small">
              Next at {formatTime(stats.next.start)}: {stats.next.title}
            </p>
          ) : null}
        </div>
      </section>

      <section className="glass card list">
        {day.tasks.length === 0 && (
          <div className="empty">
            <p>No tasks for this day yet.</p>
            <div className="row">
              <button className="btn" onClick={() => setPasting(true)}>
                Paste a schedule
              </button>
              <button className="btn ghost" onClick={repeatYesterday}>
                Repeat yesterday
              </button>
            </div>
          </div>
        )}
        <ul>
          {day.tasks.map((t) => {
            const cat = categoryOf(t.category);
            const current = isToday && isCurrent(t, now);
            return (
              <li key={t.id} className={`task ${t.done ? "done" : ""} ${current ? "current" : ""}`}>
                <button
                  className="check"
                  onClick={() => toggle(t.id)}
                  aria-label={t.done ? "Mark not done" : "Mark done"}
                  style={{ "--cat": cat.color } as React.CSSProperties}
                >
                  {t.done ? "✓" : ""}
                </button>
                <div className="task-main">
                  {editing === t.id ? (
                    <input
                      autoFocus
                      className="inline-edit"
                      defaultValue={t.title}
                      onBlur={(e) => rename(t.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(t.id, e.currentTarget.value);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <span className="task-title" onDoubleClick={() => setEditing(t.id)}>
                      {t.title}
                    </span>
                  )}
                  <span className="task-meta">
                    {t.start && (
                      <span>
                        {formatTime(t.start)}
                        {t.end && ` – ${formatTime(t.end)}`}
                      </span>
                    )}
                    <span className="cat" style={{ color: cat.color }}>
                      {cat.label}
                    </span>
                  </span>
                </div>
                <button
                  className="icon-btn remove"
                  title="Delete"
                  onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass card add">
        <input
          value={draft}
          placeholder="Add a task, e.g. Gym 6-7 pm"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />
        <button className="btn" onClick={addTask} disabled={!draft.trim()}>
          Add
        </button>
        <button className="btn ghost" onClick={() => setPasting(true)} title="Paste a whole schedule">
          Paste
        </button>
      </section>

      <textarea
        className="glass card note"
        placeholder="Notes for the day…"
        value={day.note ?? ""}
        onChange={(e) => update((d) => ({ ...d, note: e.target.value || undefined }))}
      />

      {pasting && <PasteSheet date={date} onClose={() => setPasting(false)} />}
    </div>
  );
}
