import { describe, expect, it } from "vitest";
import { parseDateLine, parseLine, parseSchedule } from "./parser";

const SAMPLE = `Like wake up at 4 am
29 July 2026

* Wake up @ 7:00 am
* Boiling Noodles + Bathing + Getting Ready 7:00-7:30 am
* Cooking + Breakfast + Cleaning Dishes 7:30-8:00 am
* Saying hi to roommates
* Travel to Finance Library + Confirming return of book 8:20-9:00 am
* Case 1: Modules Finalisation (27 ECTS) 9:00-9:30 am
* Case 2: Deciding on whether to take semester abroad or not 9:30-10:00 am - cost and everything in case I do (Awaiting follow up from Financial aid office)
* Applied to an investment challenge
* mapping out the study course for next 2 years and asking parents what’s best 10:00-11:00 am
* Creating a list of potential universities in US with funded Phd + budget + Deadlines 11:00-12:00 pm
* Creating Job application MCP 12:00-15:00 pm
* PMP application documents + cover letter 15:00-15:30 pm
* GYM or Nap (depends) 15:30-17:30 pm
* Travel & chill time 17:30-20:40 pm
* Travel Back 20:40-21:30 pm
* Sleep 22:00-4:30 am`;

describe("parseSchedule", () => {
  const { date, tasks } = parseSchedule(SAMPLE);
  const pick = (i: number) => ({ title: tasks[i].title, start: tasks[i].start, end: tasks[i].end, category: tasks[i].category });

  it("reads the date and only bullet lines", () => {
    expect(date).toBe("2026-07-29");
    expect(tasks).toHaveLength(16);
  });

  it("parses times and titles", () => {
    expect(pick(0)).toEqual({ title: "Wake up", start: "07:00", end: undefined, category: "routine" });
    expect(pick(1)).toMatchObject({ title: "Boiling Noodles + Bathing + Getting Ready", start: "07:00", end: "07:30" });
    expect(pick(3)).toEqual({ title: "Saying hi to roommates", start: undefined, end: undefined, category: "social" });
    expect(pick(5)).toMatchObject({ title: "Case 1: Modules Finalisation (27 ECTS)", start: "09:00", end: "09:30", category: "study" });
    expect(pick(6).title).toBe(
      "Case 2: Deciding on whether to take semester abroad or not - cost and everything in case I do (Awaiting follow up from Financial aid office)",
    );
    expect(pick(6)).toMatchObject({ start: "09:30", end: "10:00" });
    expect(pick(9)).toMatchObject({ start: "11:00", end: "12:00", category: "study" });
    expect(pick(10)).toMatchObject({ start: "12:00", end: "15:00", category: "career" });
    expect(pick(13)).toMatchObject({ title: "Travel & chill time", start: "17:30", end: "20:40", category: "travel" });
    expect(pick(15)).toMatchObject({ title: "Sleep", start: "22:00", end: "04:30", category: "sleep" });
    expect(tasks.every((t) => !t.done)).toBe(true);
  });
});

describe("parseLine", () => {
  it("spreads a trailing pm over the range", () => {
    expect(parseLine("Lunch 1:00-2 pm")).toMatchObject({ start: "13:00", end: "14:00" });
    expect(parseLine("Study 9-11am")).toMatchObject({ start: "09:00", end: "11:00" });
  });
  it("handles single times", () => {
    expect(parseLine("Wake up at 4 am")).toMatchObject({ title: "Wake up", start: "04:00" });
    expect(parseLine("Call mom 18:30")).toMatchObject({ title: "Call mom", start: "18:30" });
  });
  it("leaves plain numbers alone", () => {
    const t = parseLine("Read pages 2-3");
    expect(t?.title).toBe("Read pages 2-3");
    expect(t?.start).toBeUndefined();
    expect(parseLine("Plan the next 2 years")?.start).toBeUndefined();
  });
  it("keeps checked boxes done", () => {
    expect(parseLine("- [x] Gym 6:00-7:00 am")).toMatchObject({ title: "Gym", done: true });
  });
});

describe("parseDateLine", () => {
  it("accepts common formats", () => {
    expect(parseDateLine("29 July 2026")).toBe("2026-07-29");
    expect(parseDateLine("Wednesday, July 29, 2026")).toBe("2026-07-29");
    expect(parseDateLine("2026-07-29")).toBe("2026-07-29");
    expect(parseDateLine("Wake up at 4 am")).toBeUndefined();
  });
});
