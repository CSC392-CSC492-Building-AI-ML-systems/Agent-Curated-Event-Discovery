import { useEffect, useState } from "react";
import { loadEventCatalog, loadEventsLikedCatalog, loadEventsSavedCatalog } from "../api/catalog";
import type { EventideEvent } from "../interfaces/interfaces";

export default function useEvents() {
  const [events, setEvents] = useState<EventideEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      try {
        const result = await loadEventCatalog({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setEvents(result);
        }
      } catch (reason: unknown) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "Unable to load events",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchEvents();

    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }

  return { events, loading, error, retry };
}

export function useEventsLiked(token: string | null) {
  const [events, setEvents] = useState<EventideEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [accessToken, setAccessToken] = useState(token);
  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      if (!accessToken){
        setLoading(false);
        setError("");
        return;
      }
      try {
        const result = await loadEventsLikedCatalog({
          signal: controller.signal,
          accessToken: accessToken
        });

        if (!controller.signal.aborted) {
          setEvents(result);
        }
      } catch (reason: unknown) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "Unable to load liked events",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void fetchEvents();

    return () => controller.abort();
  }, [attempt, accessToken]);

  function retry(token: string | null) {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
    setAccessToken(token);
  }

  return { events, loading, error, retry };
}

export function useEventsSaved(token: string | null) {
  const [events, setEvents] = useState<EventideEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [accessToken, setAccessToken] = useState(token);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      if (!accessToken){
        setLoading(false);
        setError("");
        return;
      }
      try {
        const result = await loadEventsSavedCatalog({
          signal: controller.signal,
          accessToken: accessToken
        });

        if (!controller.signal.aborted) {
          setEvents(result);
        }
      } catch (reason: unknown) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "Unable to load liked events",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchEvents();

    return () => controller.abort();
  }, [attempt, accessToken]);

  function retry(token: string | null) {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
    setAccessToken(token);
  }

  return { events, loading, error, retry };
}

