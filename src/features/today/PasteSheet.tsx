import { useMemo, useState } from "react";
import { useApp } from "../../shell/AppContext";
import { formatLongDate, formatTime } from "../../lib/date";
import { categoryOf, parseSchedule } from "../../lib/parser";
import { loadDay, saveDay } from "../../lib/storage";

export default function PasteSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { setDate } = useApp();
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseSchedule(text), [text]);
  const target = parsed.date ?? date;

  async function importInto(mode: "replace" | "append") {
    const day = await loadDay(target);
    const tasks = mode === "replace" ? parsed.tasks : [...day.tasks, ...parsed.tasks];
    await saveDay({ ...day, tasks });
    setDate(target);
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet glass wide" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Paste a schedule</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <textarea
          autoFocus
          className="paste-input"
          placeholder={"29 July 2026\n* Wake up @ 7:00 am\n* Breakfast 7:30-8:00 am\n* Sleep 22:00-4:30 am"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {parsed.tasks.length > 0 && (
          <>
            <p className="muted small">
              {parsed.tasks.length} tasks for {formatLongDate(target)}
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
              <button className="btn ghost" onClick={() => importInto("append")}>
                Add to day
              </button>
              <button className="btn" onClick={() => importInto("replace")}>
                Replace day
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
