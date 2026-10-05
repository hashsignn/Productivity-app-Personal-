import { useCallback, useEffect, useState } from "react";
import type { Day } from "../../lib/types";
import { listDays, loadDay } from "../../lib/storage";

/**
 * Loads every saved day. Accepts listDays() returning either dates or whole days,
 * and reloads when the window regains focus so ticks made elsewhere show up.
 */
export function useDays(enabled = true): { days: Day[]; loading: boolean } {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const listed = (await listDays()) as Array<string | Day>;
      const loaded = await Promise.all(
        listed.map((entry) => (typeof entry === "string" ? loadDay(entry) : entry)),
      );
      setDays(loaded.filter((d): d is Day => !!d));
    } catch (err) {
      console.error("charts: failed to load days", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [enabled, refresh]);

  return { days, loading };
}
