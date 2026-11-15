import { useEffect, useRef, useState } from "react";
import { getAvailability, saveAvailability } from "../api/availability";
import type { WeeklyAvailability } from "../api/availabilityTypes";
import { userAccessToken } from "../lib/supabase/session";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; schedule: WeeklyAvailability; savedSchedule: WeeklyAvailability };
type SaveState =
  | { status: "idle" | "saving" | "saved" }
  | { status: "error"; message: string };

export default function useAvailability(userId: string) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const mutation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const token = await userAccessToken(userId);
        if (controller.signal.aborted) return;
        const schedule = await getAvailability(token, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ status: "ready", schedule, savedSchedule: schedule });
      } catch (reason) {
        if (!controller.signal.aborted) setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Unable to load your schedule. Please retry.",
        });
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

  function edit(schedule: WeeklyAvailability) {
    if (state.status !== "ready" || mutation.current) return;
    setState({ ...state, schedule });
    setSaveState({ status: "idle" });
  }

  async function save() {
    if (state.status !== "ready" || mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setSaveState({ status: "saving" });
    try {
      const token = await userAccessToken(userId);
      if (controller.signal.aborted) return;
      const schedule = await saveAvailability(state.schedule, token, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setState({ status: "ready", schedule, savedSchedule: schedule });
      setSaveState({ status: "saved" });
    } catch (reason) {
      if (!controller.signal.aborted) setSaveState({
        status: "error",
        message: reason instanceof Error ? reason.message : "Unable to save your schedule. Please retry.",
      });
    } finally {
      if (mutation.current === controller) mutation.current = null;
    }
  }

  const dirty = state.status === "ready" && (
    state.schedule.windows.length !== state.savedSchedule.windows.length
    || state.schedule.windows.some((window, index) => {
      const saved = state.savedSchedule.windows[index];
      return window.day_of_week !== saved.day_of_week
        || window.start_minute !== saved.start_minute || window.end_minute !== saved.end_minute;
    })
  );

  return { state, saveState, dirty, edit, save, retry };
}
