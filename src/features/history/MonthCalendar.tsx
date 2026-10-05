import type { CSSProperties } from "react";
import { fromISODate, toISODate } from "../../lib/date";
import { WEEKDAYS, formatMonth, monthGrid } from "./dates";
import type { DaySummary } from "./historyApi";

interface Props {
  month: Date;
  onMonthChange: (month: Date) => void;
  summaries: Map<string, DaySummary>;
  selected: string;
  onSelect: (date: string) => void;
}

export default function MonthCalendar({ month, onMonthChange, summaries, selected, onSelect }: Props) {
  const today = toISODate();
  const cells = monthGrid(month);
  const step = (delta: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <div className="glass card hx-calendar">
      <div className="hx-calendar-head">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="hx-calendar-title">{formatMonth(month)}</span>
        <button className="icon-btn" onClick={() => step(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="hx-calendar-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="hx-weekday">
            {w}
          </span>
        ))}
        {cells.map((key) => {
          const s = summaries.get(key);
          const rate = s && s.total > 0 ? s.done / s.total : 0;
          const outside = fromISODate(key).getMonth() !== month.getMonth();
          const classes = [
            "hx-cell",
            outside && "hx-cell-outside",
            key === selected && "hx-cell-selected",
            key === today && "hx-cell-today",
            key > today && "hx-cell-future",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              className={classes}
              onClick={() => onSelect(key)}
              title={s ? `${s.done}/${s.total} done${s.photos ? ` · ${s.photos} photo(s)` : ""}` : undefined}
              style={s && s.total > 0 ? ({ "--hx-rate": rate } as CSSProperties) : undefined}
            >
              <span className="hx-cell-num">{fromISODate(key).getDate()}</span>
              {s && s.total > 0 && <span className="hx-cell-fill" />}
              {s && s.photos > 0 && <span className="hx-cell-photo" aria-label="has photos" />}
            </button>
          );
        })}
      </div>
      <div className="hx-legend">
        <span>
          <i className="hx-dot hx-dot-low" /> few done
        </span>
        <span>
          <i className="hx-dot hx-dot-high" /> all done
        </span>
        <span>
          <i className="hx-dot hx-dot-photo" /> photos
        </span>
      </div>
    </div>
  );
}
