import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./history.css";
import { fromISODate } from "../../lib/date";
import { deletePhoto, loadDay, onDayChanged, saveDay } from "../../lib/storage";
import { useApp } from "../../shell/AppContext";
import type { FeatureMeta } from "../../shell/registry";
import { formatShort, monthOf } from "./dates";
import { loadAllDays, pickPhotos, summarize, type Day, type DaySummary } from "./historyApi";
import DayDetail from "./DayDetail";
import MonthCalendar from "./MonthCalendar";

export const meta: FeatureMeta = { title: "History", icon: "🗓", order: 20 };

const byDateDesc = (a: Day, b: Day) => b.date.localeCompare(a.date);

export default function History() {
  // The selected day is the shell's date, so Today and the other panels follow it.
  const { date, setDate } = useApp();
  const [days, setDays] = useState<Day[]>([]);
  const [current, setCurrent] = useState<Day | null>(null);
  const [month, setMonth] = useState(() => monthOf(fromISODate(date)));
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const dateRef = useRef(date);
  dateRef.current = date;

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  useEffect(() => {
    loadAllDays().then(setDays).catch(fail);
  }, []);

  useEffect(() => {
    let live = true;
    loadDay(date)
      .then((d) => live && setCurrent(d))
      .catch(fail);
    setMonth((m) => {
      const target = monthOf(fromISODate(date));
      return target.getTime() === m.getTime() ? m : target;
    });
    return () => {
      live = false;
    };
  }, [date]);

  // Keep in sync with edits made elsewhere (ticking in Today, adding photos).
  useEffect(
    () =>
      onDayChanged((d) => {
        setDays((all) => [d, ...all.filter((x) => x.date !== d.date)].sort(byDateDesc));
        if (d.date === dateRef.current) setCurrent(d);
      }),
    [],
  );

  const persist = useCallback((next: Day) => {
    setCurrent(next);
    saveDay(next).catch(fail);
  }, []);

  const summaries = useMemo(
    () => new Map<string, DaySummary>(days.map((d) => [d.date, summarize(d)])),
    [days],
  );

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withContent = days.filter((d) => d.tasks.length || d.photos.length || d.note);
    if (!q) return withContent.slice(0, 30);
    return withContent.filter(
      (d) =>
        d.date.includes(q) ||
        formatShort(fromISODate(d.date)).toLowerCase().includes(q) ||
        d.note?.toLowerCase().includes(q) ||
        d.tasks.some((t) => t.title.toLowerCase().includes(q)) ||
        d.photos.some((p) => p.caption?.toLowerCase().includes(q)),
    );
  }, [days, query]);

  const addPhotos = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await pickPhotos(current.date); // storage announces the updated day
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hx-root">
      <div className="hx-layout">
        {error && (
          <button className="glass card hx-error" onClick={() => setError(undefined)}>
            {error} <span className="muted small">(tap to dismiss)</span>
          </button>
        )}

        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          summaries={summaries}
          selected={date}
          onSelect={setDate}
        />

        {current && (
          <DayDetail
            day={current}
            busy={busy}
            onNavigate={setDate}
            onToggleTask={(id) =>
              persist({
                ...current,
                tasks: current.tasks.map((t) =>
                  t.id === id
                    ? { ...t, done: !t.done, doneAt: t.done ? undefined : new Date().toISOString() }
                    : t,
                ),
              })
            }
            onNote={(note) => persist({ ...current, note: note || undefined })}
            onAddPhotos={addPhotos}
            onCaption={(id, caption) =>
              persist({
                ...current,
                photos: current.photos.map((p) =>
                  p.id === id ? { ...p, caption: caption || undefined } : p,
                ),
              })
            }
            onRemovePhoto={(id) => deletePhoto(current.date, id).catch(fail)}
          />
        )}

        <div className="glass card hx-recent">
          <input
            className="hx-input"
            placeholder="Search past days, tasks, captions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul>
            {recent.length === 0 && (
              <li className="hx-empty">{query ? "No matches." : "Past days will show up here."}</li>
            )}
            {recent.map((d) => {
              const s = summarize(d);
              return (
                <li key={d.date}>
                  <button
                    className={d.date === date ? "hx-recent-row hx-recent-active" : "hx-recent-row"}
                    onClick={() => setDate(d.date)}
                  >
                    <span>{formatShort(fromISODate(d.date))}</span>
                    <span className="muted small">
                      {s.total > 0 && `${s.done}/${s.total}`}
                      {s.photos > 0 && ` · 📷 ${s.photos}`}
                    </span>
                    {s.total > 0 && (
                      <span className="hx-bar">
                        <span style={{ width: `${(s.done / s.total) * 100}%` }} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
