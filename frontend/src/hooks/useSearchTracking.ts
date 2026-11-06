import { useEffect, useRef, useCallback } from "react";
import { useAnalytics } from "./useAnalytics";

export function useSearchTracking(search: string, delay = 2000) {
  const { logSearch } = useAnalytics();

  const lastLoggedQuery = useRef<string | null>(null);

  const track = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase();

      if (!normalized || normalized === lastLoggedQuery.current) {
        return;
      }

      lastLoggedQuery.current = normalized;
      void logSearch(normalized);
    },
    [logSearch],
  );

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      lastLoggedQuery.current = null;
      return;
    }

    const timeout = window.setTimeout(() => {
      track(query);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [search, delay, track]);

  return { track };
}
