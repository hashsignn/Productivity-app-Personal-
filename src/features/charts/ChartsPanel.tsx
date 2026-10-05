import { useMemo, useState } from "react";
import type { Day } from "../../lib/types";
import { CompletionChart, fmtDate, HEAT_WEEKS, hrs, HoursChart, pct, StreakCalendar } from "./charts";
import { addDays, averageRate, STREAK_THRESHOLD, dailyStats, hoursByCategory, isoDate, streaks } from "./stats";
import { TooltipProvider } from "./Tooltip";
import { useDays } from "./useDays";
import "./charts.css";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/**
 * Progress charts: today's score, streaks, daily completion rate and where the hours go.
 * Reads saved days from storage by default; pass `days` to render a given set instead.
 */
export default function ChartsPanel({ days: given }: { days?: Day[] }) {
  const loaded = useDays(!given);
  const days = given ?? loaded.days;
  const [range, setRange] = useState(7);
  const [asTable, setAsTable] = useState(false);
  const today = isoDate(new Date());
  const from = addDays(today, -(range - 1));

  const data = useMemo(() => {
    const ranged = dailyStats(days, from, today);
    const heatStart = addDays(today, -7 * HEAT_WEEKS);
    const heat = new Map(dailyStats(days, heatStart, today).map((s) => [s.date, s]));
    return {
      ranged,
      heat,
      todayStat: ranged[ranged.length - 1],
      avg: averageRate(ranged),
      streak: streaks(days, today),
      hours: hoursByCategory(days, from, today),
    };
  }, [days, from, today]);

  const { todayStat, streak, avg, hours } = data;
  const empty = !given && !loaded.loading && days.length === 0;

  return (
    <section className="charts-root" aria-label="Progress charts" data-loading={!given && loaded.loading}>
      <TooltipProvider>
        <div className="charts-filters">
          <div className="charts-seg" role="radiogroup" aria-label="Range">
            {RANGES.map((r) => (
              <button
                key={r.days}
                role="radio"
                aria-checked={range === r.days}
                className={range === r.days ? "is-on" : ""}
                onClick={() => setRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="charts-link" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? "Show charts" : "Show table"}
          </button>
        </div>

        {empty && <p className="charts-empty">Tick off a few tasks and your progress will show up here.</p>}

        <div className="charts-tiles">
          <Tile
            value={todayStat.total ? pct(todayStat.rate!) : "–"}
            label={todayStat.total ? `Today · ${todayStat.done} of ${todayStat.total} done` : "Today · no tasks yet"}
          />
          <Tile value={`${streak.current}`} label={streak.current === 1 ? "Day streak" : "Days in a row"} />
          <Tile value={`${streak.best}`} label="Best streak" />
          <Tile value={avg === null ? "–" : pct(avg)} label={`Average, last ${range} days`} />
        </div>

        {asTable ? (
          <DataTables stats={data.ranged} hours={hours} />
        ) : (
          <>
            <div className="charts-card">
              <h3>Completion rate</h3>
              <p className="charts-sub">Dashed line is the {pct(STREAK_THRESHOLD)} streak goal</p>
              <CompletionChart stats={data.ranged} />
            </div>
            <div className="charts-card">
              <h3>Where the hours go</h3>
              {hours.length ? (
                <HoursChart rows={hours} />
              ) : (
                <p className="charts-muted">Add start and end times to tasks to see hours by category.</p>
              )}
            </div>
            <div className="charts-card">
              <h3>Streaks · last {HEAT_WEEKS} weeks</h3>
              <StreakCalendar stats={data.heat} today={today} />
            </div>
          </>
        )}
      </TooltipProvider>
    </section>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="charts-tile">
      <div className="charts-tile-value">{value}</div>
      <div className="charts-tile-label">{label}</div>
    </div>
  );
}

function DataTables({ stats, hours }: { stats: ReturnType<typeof dailyStats>; hours: ReturnType<typeof hoursByCategory> }) {
  return (
    <div className="charts-card">
      <table className="charts-table">
        <caption>Completion by day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Done</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {[...stats].reverse().map((s) => (
            <tr key={s.date}>
              <td>{fmtDate(s.date)}</td>
              <td>{s.total ? `${s.done}/${s.total}` : "–"}</td>
              <td>{s.rate === null ? "–" : pct(s.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hours.length > 0 && (
        <table className="charts-table">
          <caption>Hours by category</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Done</th>
              <th>Planned</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.category}>
                <td>{h.category}</td>
                <td>{hrs(h.done)}</td>
                <td>{hrs(h.planned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
