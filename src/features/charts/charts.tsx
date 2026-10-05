import { useEffect, useRef, useState } from "react";
import { addDays, fromISODate } from "../../lib/date";
import { STREAK_THRESHOLD, type CategoryHours, type DayStat } from "./stats";
import { useTipHandlers } from "./Tooltip";

export function useWidth<T extends Element>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return fromISODate(iso).toLocaleDateString(undefined, opts);
}

export const pct = (r: number) => `${Math.round(r * 100)}%`;
const num = (h: number) => (h >= 10 || Number.isInteger(h) ? `${Math.round(h)}` : h.toFixed(1));
export const hrs = (h: number) => `${num(h)} h`;

/** Bar with only its top corners rounded, anchored to the baseline. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Bar with only its right corners rounded, anchored to the left axis. */
function rightRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

/* ---------- Completion rate per day ---------- */

export function CompletionChart({ stats }: { stats: DayStat[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useTipHandlers();
  const H = 160;
  const m = { top: 10, right: 6, bottom: 22, left: 34 };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = H - m.top - m.bottom;
  const band = stats.length ? plotW / stats.length : 0;
  const barW = Math.max(2, Math.min(28, band - 2));
  const y = (r: number) => m.top + plotH * (1 - r);

  // Sparse x labels: the last day, plus every n-th day that isn't crowding it.
  const last = stats.length - 1;
  const every = Math.max(1, Math.ceil(stats.length / 6));
  const labelIdx = new Set(stats.map((_, i) => i).filter((i) => i === last || (i % every === 0 && last - i >= every / 2)));

  return (
    <div ref={ref} className="charts-plot">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Share of tasks completed each day">
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? "c-axis" : "c-grid"} />
              <text x={m.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="c-tick">
                {pct(t)}
              </text>
            </g>
          ))}
          <line x1={m.left} x2={width - m.right} y1={y(STREAK_THRESHOLD)} y2={y(STREAK_THRESHOLD)} className="c-goal" />
          {stats.map((s, i) => {
            const cx = m.left + band * i + band / 2;
            const h = s.rate ? plotH * s.rate : 0;
            return (
              <g key={s.date}>
                {h > 0 && <path d={topRoundedBar(cx - barW / 2, y(s.rate!), barW, h, 4)} className="c-bar" />}
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={plotH}
                  className="c-hit"
                  {...tip({
                    value: s.total ? `${pct(s.rate!)} · ${s.done}/${s.total} tasks` : "No tasks",
                    label: fmtDate(s.date),
                  })}
                />
                {labelIdx.has(i) && (
                  <text x={cx} y={H - 6} textAnchor="middle" className="c-tick">
                    {fmtDate(s.date, { day: "numeric", month: "short" })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* ---------- Streak calendar ---------- */

export const HEAT_WEEKS = 12;
const HEAT_BINS = [0.25, 0.5, STREAK_THRESHOLD, 1.01];
const binOf = (r: number | null) => (r === null ? -1 : HEAT_BINS.findIndex((b) => r < b));

export function StreakCalendar({ stats, today }: { stats: Map<string, DayStat>; today: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useTipHandlers();
  const labelW = 26;
  const gap = 3;
  const cell = Math.max(8, Math.min(28, (width - labelW) / HEAT_WEEKS - gap));
  const H = 7 * (cell + gap);

  // Columns are Monday-start weeks; the last column holds this week.
  const dow = (fromISODate(today).getDay() + 6) % 7; // Mon = 0
  const start = addDays(today, -dow - 7 * (HEAT_WEEKS - 1));

  const cells = [];
  for (let w = 0; w < HEAT_WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) continue;
      const s = stats.get(date);
      const bin = binOf(s?.rate ?? null);
      cells.push(
        <rect
          key={date}
          x={labelW + w * (cell + gap)}
          y={d * (cell + gap)}
          width={cell}
          height={cell}
          rx={3}
          className={`c-heat c-heat-${bin}${date === today ? " c-today" : ""}`}
          {...tip({
            value: s?.total ? `${pct(s.rate!)} · ${s.done}/${s.total} tasks` : "No tasks",
            label: fmtDate(date),
          })}
        />,
      );
    }
  }

  return (
    <div ref={ref} className="charts-plot">
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Daily completion over the last ${HEAT_WEEKS} weeks`}>
          {["Mon", "Wed", "Fri"].map((l, i) => (
            <text key={l} x={0} y={i * 2 * (cell + gap) + cell / 2} dy="0.32em" className="c-tick">
              {l}
            </text>
          ))}
          {cells}
        </svg>
      )}
      <div className="charts-legend">
        <span>Less</span>
        {[-1, 0, 1, 2, 3].map((b) => (
          <svg key={b} width={12} height={12} aria-hidden>
            <rect width={12} height={12} rx={3} className={`c-heat c-heat-${b}`} />
          </svg>
        ))}
        <span>More</span>
        <span className="charts-legend-note">Darkest = {pct(STREAK_THRESHOLD)}+ done, counts toward a streak</span>
      </div>
    </div>
  );
}

/* ---------- Where the hours go ---------- */

export function HoursChart({ rows }: { rows: CategoryHours[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const tip = useTipHandlers();
  const labelW = 108;
  const valueW = 84;
  const rowH = 26;
  const barH = 12;
  const plotW = Math.max(0, width - labelW - valueW);
  const max = Math.max(1, ...rows.map((r) => r.planned));
  const x = (h: number) => (plotW * h) / max;

  return (
    <div ref={ref} className="charts-plot">
      {width > 0 && (
        <svg width={width} height={rows.length * rowH} role="img" aria-label="Hours planned and completed by category">
          {rows.map((r, i) => {
            const cy = i * rowH + rowH / 2;
            return (
              <g key={r.category.id} style={{ "--cat": r.category.color } as React.CSSProperties}>
                <text x={0} y={cy} dy="0.32em" className="c-label">
                  {r.category.label}
                </text>
                <path d={rightRoundedBar(labelW, cy - barH / 2, x(r.planned), barH, 4)} className="c-cat-track" />
                {r.done > 0 && <path d={rightRoundedBar(labelW, cy - barH / 2, x(r.done), barH, 4)} className="c-cat-bar" />}
                <text x={width} y={cy} dy="0.32em" textAnchor="end" className="c-value">
                  {num(r.done)} / {hrs(r.planned)}
                </text>
                <rect
                  x={0}
                  y={i * rowH}
                  width={width}
                  height={rowH}
                  className="c-hit"
                  {...tip({ value: `${hrs(r.done)} of ${hrs(r.planned)} done`, label: r.category.label })}
                />
              </g>
            );
          })}
        </svg>
      )}
      <div className="charts-legend">
        <svg width={12} height={12} aria-hidden>
          <rect width={12} height={12} rx={3} className="c-key-done" />
        </svg>
        <span>Done</span>
        <svg width={12} height={12} aria-hidden>
          <rect width={12} height={12} rx={3} className="c-key-planned" />
        </svg>
        <span>Planned</span>
      </div>
    </div>
  );
}
