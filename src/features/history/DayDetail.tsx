import { useEffect, useState, type CSSProperties } from "react";
import { addDays, formatLongDate, formatTime, toISODate } from "../../lib/date";
import { categoryOf } from "../../lib/parser";
import ProgressRing from "../today/ProgressRing";
import type { Day } from "./historyApi";
import PhotoGallery from "./PhotoGallery";

interface Props {
  day: Day;
  busy: boolean;
  onNavigate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onNote: (note: string) => void;
  onAddPhotos: () => void;
  onCaption: (id: string, caption: string) => void;
  onRemovePhoto: (id: string) => void;
}

export default function DayDetail({
  day,
  busy,
  onNavigate,
  onToggleTask,
  onNote,
  onAddPhotos,
  onCaption,
  onRemovePhoto,
}: Props) {
  const done = day.tasks.filter((t) => t.done).length;
  const [note, setNote] = useState(day.note ?? "");
  useEffect(() => setNote(day.note ?? ""), [day.date, day.note]);
  const isToday = day.date === toISODate();
  const year = day.date.slice(0, 4) !== String(new Date().getFullYear()) ? ` ${day.date.slice(0, 4)}` : "";

  return (
    <div className="glass card hx-detail">
      <header className="hx-detail-head">
        <div className="hx-detail-title">
          <div className="date-nav">
            <button
              className="icon-btn"
              onClick={() => onNavigate(addDays(day.date, -1))}
              title="Previous day"
            >
              ‹
            </button>
            <h2>{isToday ? "Today" : formatLongDate(day.date) + year}</h2>
            <button className="icon-btn" onClick={() => onNavigate(addDays(day.date, 1))} title="Next day">
              ›
            </button>
          </div>
          <p className="muted small">
            {day.tasks.length ? `${done} of ${day.tasks.length} tasks done` : "No tasks planned"}
            {day.photos.length ? ` · ${day.photos.length} photo${day.photos.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {day.tasks.length > 0 && <ProgressRing value={done / day.tasks.length} size={58} />}
      </header>

      <section className="hx-section">
        <h3>Tasks</h3>
        {day.tasks.length === 0 ? (
          <p className="hx-empty">Nothing was scheduled for this day.</p>
        ) : (
          <ul className="hx-tasks">
            {day.tasks.map((t) => {
              const cat = categoryOf(t.category);
              return (
                <li key={t.id} className={`task ${t.done ? "done" : ""}`}>
                  <button
                    className="check"
                    onClick={() => onToggleTask(t.id)}
                    aria-label={t.done ? "Mark not done" : "Mark done"}
                    style={{ "--cat": cat.color } as CSSProperties}
                  >
                    {t.done ? "✓" : ""}
                  </button>
                  <div className="task-main">
                    <span className="task-title">{t.title}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="hx-section">
        <h3>Note</h3>
        <textarea
          className="hx-input hx-note"
          placeholder="How did the day go? Wins, lessons, anything worth remembering…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (day.note ?? "") && onNote(note)}
          rows={3}
        />
      </section>

      <PhotoGallery
        photos={day.photos}
        busy={busy}
        onAdd={onAddPhotos}
        onCaption={onCaption}
        onRemove={onRemovePhoto}
      />
    </div>
  );
}
