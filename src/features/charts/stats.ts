import { addDays, durationMinutes } from "../../lib/date";
import { categoryOf as parserCategoryOf, guessCategory, type Category } from "../../lib/parser";
import type { Day, Task } from "../../lib/types";

/** A day counts toward a streak when at least this share of its tasks is done. */
export const STREAK_THRESHOLD = 0.8;

/** The task's saved category, or one guessed from its title for tasks saved without one. */
export function categoryOf(task: Task): Category {
  return parserCategoryOf(task.category ?? guessCategory(task.title));
}

/** Task length in hours from start/end; overnight blocks (22:00-04:30) wrap. 0 when untimed. */
export function taskHours(task: Task): number {
  return durationMinutes(task.start, task.end) / 60;
}

export interface DayStat {
  date: string; // YYYY-MM-DD
  total: number;
  done: number;
  /** done / total, or null when the day has no tasks */
  rate: number | null;
}

/** One entry per calendar day from `from` to `to` inclusive, filling gaps with empty days. */
export function dailyStats(days: Day[], from: string, to: string): DayStat[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const out: DayStat[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const tasks = byDate.get(date)?.tasks ?? [];
    const done = tasks.filter((t) => t.done).length;
    out.push({ date, total: tasks.length, done, rate: tasks.length ? done / tasks.length : null });
  }
  return out;
}

const hit = (s: DayStat | undefined) => !!s && s.rate !== null && s.rate >= STREAK_THRESHOLD;

/**
 * Current streak counts back from today. Today only adds to it once it meets the
 * threshold, so an in-progress morning doesn't reset yesterday's run to zero.
 */
export function streaks(days: Day[], today: string): { current: number; best: number } {
  if (!days.length) return { current: 0, best: 0 };
  const first = days.reduce((min, d) => (d.date < min ? d.date : min), today);
  const stats = dailyStats(days, first, today);

  let best = 0;
  let run = 0;
  for (const s of stats) {
    run = hit(s) ? run + 1 : 0;
    best = Math.max(best, run);
  }

  let i = stats.length - 1;
  if (!hit(stats[i])) i--;
  let current = 0;
  while (i >= 0 && hit(stats[i])) {
    current++;
    i--;
  }
  return { current, best };
}

export interface CategoryHours {
  category: Category;
  planned: number;
  done: number;
}

/** Planned vs completed hours per category for days within [from, to]; largest first, empty ones dropped. */
export function hoursByCategory(days: Day[], from: string, to: string): CategoryHours[] {
  const acc = new Map<string, CategoryHours>();
  for (const day of days) {
    if (day.date < from || day.date > to) continue;
    for (const task of day.tasks) {
      const h = taskHours(task);
      if (!h) continue;
      const cat = categoryOf(task);
      const row = acc.get(cat.id) ?? { category: cat, planned: 0, done: 0 };
      row.planned += h;
      if (task.done) row.done += h;
      acc.set(cat.id, row);
    }
  }
  return [...acc.values()].sort((a, b) => b.planned - a.planned);
}

export function averageRate(stats: DayStat[]): number | null {
  const rated = stats.filter((s) => s.rate !== null);
  if (!rated.length) return null;
  return rated.reduce((sum, s) => sum + (s.rate as number), 0) / rated.length;
}
