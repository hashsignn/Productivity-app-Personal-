// Turns a pasted schedule into tasks. Handles the loose format people
// actually type, e.g.
//
//   29 July 2026
//   * Wake up @ 7:00 am
//   * Cooking + Breakfast 7:30-8:00 am
//   * Saying hi to roommates
//   * Sleep 22:00-4:30 am
//
// If any line is a bullet, only bullet lines become tasks (the rest is
// treated as a heading or note). Otherwise every line that is not a date
// becomes a task.

import { newId } from "./date";
import type { Task } from "./types";

export interface ParsedSchedule {
  /** "YYYY-MM-DD" when the paste contained a date line. */
  date?: string;
  tasks: Task[];
}

export interface Category {
  id: string;
  label: string;
  color: string;
}

/** Categories guessed from task titles; charts colour by these. */
export const CATEGORIES: Category[] = [
  { id: "sleep", label: "Sleep", color: "#8b9cff" },
  { id: "fitness", label: "Fitness", color: "#4fd1a5" },
  { id: "travel", label: "Travel", color: "#ffb86b" },
  { id: "career", label: "Career", color: "#ff7eb6" },
  { id: "study", label: "Study", color: "#6cc6ff" },
  { id: "meals", label: "Meals", color: "#ffd166" },
  { id: "routine", label: "Routine", color: "#b8c0cc" },
  { id: "social", label: "Social", color: "#c79bff" },
  { id: "other", label: "Other", color: "#9aa5b1" },
];

const KEYWORDS: [string, RegExp][] = [
  ["sleep", /\b(sleep|bed ?time)\b/i],
  ["fitness", /\b(gym|workout|work out|run|running|yoga|exercise|swim|walk)\b/i],
  ["travel", /\b(travel|commute|bus|train|drive|flight)\b/i],
  ["career", /\b(job|application|cover letter|pmp|cv|resume|résumé|interview|internship|investment|linkedin)\b/i],
  ["study", /\b(study|studying|module|modules|course|ects|library|lecture|exam|read|reading|phd|universit\w*|semester|homework|assignment)\b/i],
  ["meals", /\b(breakfast|lunch|dinner|cook\w*|eat\w*|noodles|meal|snack)\b/i],
  ["routine", /\b(wake|bath\w*|shower|getting ready|dishes|clean\w*|laundry|groceries)\b/i],
  ["social", /\b(roommates?|friends?|parents|family|call|chill|hang ?out)\b/i],
];

export function guessCategory(title: string): string {
  for (const [id, re] of KEYWORDS) if (re.test(title)) return id;
  return "other";
}

export function categoryOf(id?: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function monthIndex(name: string): number {
  const n = name.toLowerCase().slice(0, 3);
  return MONTHS.findIndex((m) => m.startsWith(n));
}

function iso(y: number, m: number, d: number): string | undefined {
  if (m < 0 || m > 11 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Recognises a line that is just a date: "29 July 2026", "July 29, 2026", "2026-07-29". */
export function parseDateLine(line: string): string | undefined {
  const s = line.trim().replace(/^(mon|tue|wed|thu|fri|sat|sun)\w*,?\s+/i, "");
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return iso(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{4})$/i);
  if (m && monthIndex(m[2]) >= 0) return iso(+m[3], monthIndex(m[2]), +m[1]);
  m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
  if (m && monthIndex(m[1]) >= 0) return iso(+m[3], monthIndex(m[1]), +m[2]);
  return undefined;
}

type Meridiem = "am" | "pm" | undefined;

function meridiem(s?: string): Meridiem {
  if (!s) return undefined;
  return s.toLowerCase().startsWith("p") ? "pm" : "am";
}

function to24(h: number, mer: Meridiem): number {
  if (h > 12 || !mer) return h;
  if (mer === "pm") return h === 12 ? 12 : h + 12;
  return h === 12 ? 0 : h;
}

function hhmm(h: number, m: number): string {
  return `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const MER = String.raw`(a\.?m\.?|p\.?m\.?)`;
const RANGE = new RegExp(
  String.raw`(?:@\s*|\bat\s+|\bfrom\s+)?\b(\d{1,2})(?:[:.](\d{2}))?\s*${MER}?\s*(?:-|–|—|\bto\b|\buntil\b)\s*(\d{1,2})(?:[:.](\d{2}))?\s*${MER}?(?![\w])`,
  "i",
);
const SINGLE = new RegExp(
  String.raw`(?:@\s*|\bat\s+)?\b(\d{1,2})(?:[:.](\d{2}))?\s*${MER}?(?![\w])`,
  "gi",
);

interface TimeMatch {
  start: string;
  end?: string;
  index: number;
  length: number;
}

function findTime(text: string): TimeMatch | undefined {
  const r = text.match(RANGE);
  // A range needs a colon or am/pm somewhere so "pages 2-3" is not a time.
  if (r && r.index !== undefined && (r[2] || r[3] || r[5] || r[6])) {
    const [sh, sm, smer, eh, em, emer] = [+r[1], +(r[2] ?? 0), meridiem(r[3]), +r[4], +(r[5] ?? 0), meridiem(r[6])];
    if (sh <= 24 && eh <= 24 && sm < 60 && em < 60) {
      const end = to24(eh, emer);
      let start = to24(sh, smer);
      // "1:00-3:00 pm": the pm belongs to both ends when that keeps the
      // range in order. "11:00-12:00 pm" stays 11:00-12:00.
      if (!smer && emer === "pm" && sh < 12 && sh + 12 <= end) start = sh + 12;
      return { start: hhmm(start, sm), end: hhmm(end, em), index: r.index, length: r[0].length };
    }
  }
  for (const s of text.matchAll(SINGLE)) {
    if (s.index === undefined || !(s[2] || s[3])) continue;
    const h = +s[1];
    const m = +(s[2] ?? 0);
    if (h > 24 || m >= 60) continue;
    return { start: hhmm(to24(h, meridiem(s[3])), m), index: s.index, length: s[0].length };
  }
  return undefined;
}

const BULLET = /^\s*(?:[*\-•–—·>]|\d+[.)]|\[[ xX✓]?\])\s+/;
const CHECKED = /^\s*(?:[*\-•]\s+)?\[[xX✓]\]/;

function cleanTitle(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,;:@\-–—]+|[\s,;:@\-–—]+$/g, "")
    .replace(/\s+(?:at|from|@)$/i, "")
    .trim();
}

export function parseLine(raw: string): Task | undefined {
  const done = CHECKED.test(raw);
  let text = raw.replace(BULLET, "").replace(/^\s*\[[ xX✓]?\]\s*/, "").trim();
  if (!text) return undefined;
  const t = findTime(text);
  if (t) text = text.slice(0, t.index) + " " + text.slice(t.index + t.length);
  const title = cleanTitle(text);
  if (!title) return undefined;
  const task: Task = { id: newId(), title, done, category: guessCategory(title) };
  if (t) {
    task.start = t.start;
    if (t.end) task.end = t.end;
  }
  if (done) task.doneAt = new Date().toISOString();
  return task;
}

export function parseSchedule(input: string): ParsedSchedule {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());
  let date: string | undefined;
  const hasBullets = lines.some((l) => BULLET.test(l));
  const tasks: Task[] = [];
  for (const line of lines) {
    const d = parseDateLine(line);
    if (d) {
      date ??= d;
      continue;
    }
    if (hasBullets && !BULLET.test(line)) continue;
    const task = parseLine(line);
    if (task) tasks.push(task);
  }
  return { date, tasks };
}
