/** Local date as "YYYY-MM-DD". */
export function toISODate(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = fromISODate(date);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function formatLongDate(date: string): string {
  return fromISODate(date).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "HH:MM" to minutes since midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes a task spans, handling ranges that cross midnight (22:00-04:30). */
export function durationMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const d = toMinutes(end) - toMinutes(start);
  return d >= 0 ? d : d + 24 * 60;
}

/** Shows "HH:MM" as "7:30 am" style. */
export function formatTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
