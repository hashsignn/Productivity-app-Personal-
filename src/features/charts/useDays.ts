import { useEffect, useState } from "react";
import type { Day } from "../../lib/types";
import { loadDays, onDayChanged } from "../../lib/storage";

/** Every saved day, kept current as tasks are ticked in other panels. */
export function useDays(): { days: Day[]; loading: boolean } {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    loadDays()
      .then((d) => live && setDays(d))
      .catch((err) => console.error("charts: failed to load days", err))
      .finally(() => live && setLoading(false));

    const off = onDayChanged((changed) =>
      setDays((prev) => {
        const rest = prev.filter((d) => d.date !== changed.date);
        return [...rest, changed];
      }),
    );
    return () => {
      live = false;
      off();
    };
  }, []);

  return { days, loading };
}
