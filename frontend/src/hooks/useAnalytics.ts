// src/hooks/useAnalytics.ts

import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { trackEventClick, trackTagClick, trackSearch } from "../api/analytics";

export function useAnalytics() {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const logEventClick = useCallback(
    async (eventId: number): Promise<void> => {
      if (!accessToken) return;

      try {
        await trackEventClick(eventId, accessToken);
      } catch (error) {
        console.warn("Failed to log event click:", error);
      }
    },
    [accessToken],
  );

  const logTagClick = useCallback(
    async (tagId: number): Promise<void> => {
      if (!accessToken) return;

      try {
        await trackTagClick(tagId, accessToken);
      } catch (error) {
        console.warn("Failed to log tag click:", error);
      }
    },
    [accessToken],
  );

  const logSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!accessToken || !query.trim()) return;

      try {
        await trackSearch(query.trim(), accessToken);
      } catch (error) {
        console.log(error);
        console.warn("Failed to log search:", error);
      }
    },
    [accessToken],
  );

  return {
    logEventClick,
    logTagClick,
    logSearch,
  };
}
