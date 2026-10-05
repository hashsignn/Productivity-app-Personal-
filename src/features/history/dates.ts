// Calendar helpers for the history view; shared date utilities live in lib/date.
import { toISODate } from "../../lib/date";

/** 6x7 grid of "YYYY-MM-DD" keys for the month containing `month`, weeks starting Monday. */
export function monthGrid(month: Date): string[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), 1 - offset + i)));
  }
  return cells;
}

export function monthOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatMonth(month: Date): string {
  return month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
