import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../shell/AppContext";
import { formatLongDate, formatTime } from "../../lib/date";
import { categoryOf, parseSchedule } from "../../lib/parser";
import { loadDay, saveDay } from "../../lib/storage";
import Sheet from "../../shell/Sheet";

export default function PasteSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { setDate } = useApp();
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseSchedule(text), [text]);
  const target = parsed.date ?? date;
  const [existing, setExisting] = useState(0);
  useEffect(() => {
    let live = true;
    loadDay(target).then((d) => live && setExisting(d.tasks.length));
    return () => {
      live = false;
    };
  }, [target]);

  async function importInto(mode: "replace" | "append") {
    const day = await loadDay(target);
    const tasks = mode === "replace" ? parsed.tasks : [...day.tasks, ...parsed.tasks];
    await saveDay({ ...day, tasks });
    setDate(target);
    onClose();
  }

  return (
    <Sheet title="Paste a schedule" wide onClose={onClose}>
        <p className="muted small sheet-lede">
          One task per line, with a time anywhere in it. A date line on top (like 29 July 2026)
          puts the tasks on that day; otherwise they go on {formatLongDate(date)}.
        </p>
        <textarea
          autoFocus
          className="paste-input"
          aria-label="Schedule text"
          placeholder={"29 July 2026\n* Wake up @ 7:00 am\n* Breakfast 7:30-8:00 am\n* Sleep 22:00-4:30 am"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text.trim() && parsed.tasks.length === 0 && (
          <p className="muted small">No tasks found yet. Put each task on its own line.</p>
        )}
        {parsed.tasks.length > 0 && (
          <>
            <p className="muted small">
              {parsed.tasks.length} {parsed.tasks.length === 1 ? "task" : "tasks"} for{" "}
              <strong>{formatLongDate(target)}</strong>
              {existing > 0 && ` · that day already has ${existing}`}
            </p>
            <ul className="preview">
              {parsed.tasks.map((t) => (
                <li key={t.id}>
                  <span className="dot" style={{ background: categoryOf(t.category).color }} />
                  <span className="preview-time">
                    {t.start ? formatTime(t.start) : ""}
                    {t.end ? `–${formatTime(t.end)}` : ""}
                  </span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
            <div className="row end">
              {existing > 0 ? (
                <>
                  <button className="btn ghost" onClick={() => importInto("replace")}>
                    Replace the {existing} existing
                  </button>
                  <button className="btn" onClick={() => importInto("append")}>
                    Add {parsed.tasks.length} to the day
                  </button>
                </>
              ) : (
                <button className="btn" onClick={() => importInto("append")}>
                  Add {parsed.tasks.length} {parsed.tasks.length === 1 ? "task" : "tasks"}
                </button>
              )}
            </div>
          </>
        )}
    </Sheet>
  );
}
