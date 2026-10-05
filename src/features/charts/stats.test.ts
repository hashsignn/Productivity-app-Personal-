import { describe, expect, it } from "vitest";
import type { Day, Task } from "../../lib/types";
import { addDays } from "../../lib/date";
import { categoryOf, dailyStats, hoursByCategory, streaks, taskHours } from "./stats";

const task = (title: string, done = false, start?: string, end?: string): Task => ({
  id: title,
  title,
  start,
  end,
  done,
});
const day = (date: string, doneOf: [number, number]): Day => ({
  date,
  photos: [],
  tasks: Array.from({ length: doneOf[1] }, (_, i) => task(`t${i}`, i < doneOf[0])),
});

describe("taskHours", () => {
  it("measures a normal block", () => expect(taskHours(task("x", false, "12:00", "15:00"))).toBe(3));
  it("wraps overnight", () => expect(taskHours(task("Sleep", false, "22:00", "04:30"))).toBe(6.5));
  it("is zero when untimed", () => expect(taskHours(task("Saying hi to roommates"))).toBe(0));
});

describe("categoryOf", () => {
  it.each([
    ["Boiling Noodles + Bathing + Getting Ready", "meals"],
    ["Travel to Finance Library + Confirming return of book", "travel"],
    ["Case 1: Modules Finalisation (27 ECTS)", "study"],
    ["PMP application documents + cover letter", "career"],
    ["GYM or Nap (depends)", "fitness"],
    ["Saying hi to roommates", "social"],
    ["Sleep", "sleep"],
    ["Something else", "other"],
  ])("guesses %s -> %s for tasks saved without a category", (title, id) =>
    expect(categoryOf(task(title)).id).toBe(id));

  it("prefers the saved category", () => {
    expect(categoryOf({ ...task("Gym"), category: "study" }).id).toBe("study");
  });
});

describe("dailyStats", () => {
  it("fills gaps with empty days", () => {
    const s = dailyStats([day("2026-07-29", [3, 4])], "2026-07-28", "2026-07-30");
    expect(s.map((d) => d.rate)).toEqual([null, 0.75, null]);
  });
  it("crosses month ends", () => expect(addDays("2026-07-31", 1)).toBe("2026-08-01"));
});

describe("streaks", () => {
  const today = "2026-10-05";
  const run = (rates: [number, number][]) =>
    rates.map((r, i) => day(addDays(today, i - rates.length + 1), r));

  it("counts consecutive days at or above 80%", () => {
    expect(streaks(run([[5, 5], [1, 5], [4, 5], [5, 5], [5, 5]]), today)).toEqual({ current: 3, best: 3 });
  });
  it("keeps yesterday's streak while today is in progress", () => {
    expect(streaks(run([[5, 5], [5, 5], [1, 5]]), today)).toEqual({ current: 2, best: 2 });
  });
  it("breaks on a missing day", () => {
    const days = [day("2026-10-01", [5, 5]), day("2026-10-02", [5, 5]), day("2026-10-04", [5, 5])];
    expect(streaks(days, today)).toEqual({ current: 1, best: 2 });
  });
  it("handles no data", () => expect(streaks([], today)).toEqual({ current: 0, best: 0 }));
});

describe("hoursByCategory", () => {
  it("sums planned and done hours in range, largest first", () => {
    const days: Day[] = [
      {
        date: "2026-07-29",
        photos: [],
        tasks: [
          task("Creating Job application MCP", true, "12:00", "15:00"),
          task("PMP application documents", false, "15:00", "15:30"),
          task("Modules Finalisation", true, "09:00", "09:30"),
          task("Saying hi to roommates", true),
        ],
      },
      { date: "2026-06-01", photos: [], tasks: [task("Study", true, "09:00", "17:00")] },
    ];
    const rows = hoursByCategory(days, "2026-07-01", "2026-07-31");
    expect(rows.map((r) => [r.category.id, r.planned, r.done])).toEqual([
      ["career", 3.5, 3],
      ["study", 0.5, 0.5],
    ]);
  });
});
