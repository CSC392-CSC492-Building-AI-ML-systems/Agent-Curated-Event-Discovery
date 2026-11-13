import { useEffect, useRef, useState } from "react";
import {
  createCalendarSubscription,
  disableCalendarSubscription,
  getCalendarSubscription,
} from "../api/calendarSubscription";
import type { CalendarSubscriptionStatus } from "../api/calendarSubscription";
import { calendarAccessToken } from "../lib/supabase/session";

type ReadState =
  | { status: "loading" }
  | { status: "ready"; subscription: CalendarSubscriptionStatus }
  | { status: "error"; message: string };

type SubscriptionAction = "create" | "disable";

export default function useCalendarSubscription(userId: string) {
  const [state, setState] = useState<ReadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateUrl, setPrivateUrl] = useState<string | null>(null);
  const mutation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const token = await calendarAccessToken(userId);
        const subscription = await getCalendarSubscription(token, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ status: "ready", subscription });
      } catch (reason) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message: reason instanceof Error ? reason.message : "Unable to load subscription.",
          });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [userId, attempt]);

  useEffect(() => () => mutation.current?.abort(), []);

  function retry() {
    setState({ status: "loading" });
    setAttempt(value => value + 1);
  }

  async function change(action: SubscriptionAction): Promise<boolean> {
    if (mutation.current) return false;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setError(null);
    try {
      const token = await calendarAccessToken(userId);
      if (controller.signal.aborted) return false;
      if (action === "create") {
        const result = await createCalendarSubscription(token, { signal: controller.signal });
        if (controller.signal.aborted) return false;
        setPrivateUrl(result.subscription_url);
        setState({
          status: "ready",
          subscription: { enabled: result.enabled, created_at: result.created_at },
        });
      } else {
        await disableCalendarSubscription(token, { signal: controller.signal });
        if (controller.signal.aborted) return false;
        setPrivateUrl(null);
        setState({ status: "ready", subscription: { enabled: false, created_at: null } });
      }
      return true;
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Unable to update subscription. Please retry.");
      }
      return false;
    } finally {
      if (mutation.current === controller) mutation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return {
    state,
    busy,
    error,
    privateUrl,
    enabled: state.status === "ready" && state.subscription.enabled,
    retry,
    change,
    clearError: () => setError(null),
  };
}
