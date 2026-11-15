import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadCalendar, updateCalendar } from "../api/calendar";
import type { EventideEvent } from "../interfaces/interfaces";
import { calendarAccessToken } from "../lib/supabase/session";
import { findEventConflicts } from "../utils/eventConflicts";
import useConflictNotifications from "../hooks/useConflictNotifications";
import ConflictNotifications from "../components/ConflictNotifications";
import Popup from "../components/Popup";
import { useAuth } from "./AuthContext";
import { CalendarContext } from "./calendarContext";

export default function CalendarProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [events, setEvents] = useState<EventideEvent[]>([]);
  const currentEvents = useRef<EventideEvent[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set());
  const requests = useRef(new Map<number, AbortController>());
  const [actionError, setActionError] = useState<string | null>(null);
  const dismissError = useCallback(() => setActionError(null), []);
  const conflicts = useConflictNotifications();

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function fetchCalendar(ownerId: string) {
      try {
        const token = await calendarAccessToken(ownerId);
        const result = await loadCalendar(token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        currentEvents.current = result;
        setEvents(result);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load calendar events.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void fetchCalendar(userId);
    return () => controller.abort();
  }, [userId, attempt]);

  useEffect(() => {
    const activeRequests = requests.current;
    return () => {
      for (const controller of activeRequests.values()) controller.abort();
    };
  }, []);

  function retry() {
    setLoading(true);
    setError(null);
    setAttempt(value => value + 1);
  }

  async function toggle(event: EventideEvent) {
    if (!userId || loading || error || requests.current.has(event.id)) return;
    const adding = !currentEvents.current.some(item => item.id === event.id);
    const controller = new AbortController();
    requests.current.set(event.id, controller);
    setPending(current => new Set([...current, event.id]));
    setActionError(null);
    try {
      const token = await calendarAccessToken(userId);
      if (controller.signal.aborted) return;
      await updateCalendar(event.id, adding ? "PUT" : "DELETE", token, { signal: controller.signal });
      if (controller.signal.aborted) return;
      // Use the latest confirmed calendar so simultaneous additions don't lose entries.
      const existing = currentEvents.current;
      const overlapping = adding ? findEventConflicts(event, existing) : [];
      const next = adding ? [...existing, event] : existing.filter(item => item.id !== event.id);
      currentEvents.current = next;
      setEvents(next);
      if (adding) conflicts.notify(event.title, overlapping.map(item => item.title));
    } catch (reason) {
      if (!controller.signal.aborted) {
        setActionError(reason instanceof Error ? reason.message : "Unable to update calendar; please retry.");
      }
    } finally {
      requests.current.delete(event.id);
      if (!controller.signal.aborted) {
        setPending(current => new Set([...current].filter(id => id !== event.id)));
      }
    }
  }

  return (
    <CalendarContext.Provider value={{ events, pending, loading, error, retry, toggle }}>
      {children}
      <Popup visible={!!actionError} message={actionError ?? ""} duration={5000} onClose={dismissError} />
      <ConflictNotifications notifications={conflicts.notifications} onDismiss={conflicts.dismiss} />
    </CalendarContext.Provider>
  );
}
