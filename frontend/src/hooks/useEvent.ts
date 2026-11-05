import { useEffect, useState } from "react";
import { getEvent } from "../api/events";
import { toEventideEvent } from "../api/adapters";
import type { EventideEvent, EventideTag } from "../interfaces/interfaces";

type RequestState =
  | { status: "idle" }
  | { status: "loading"; eventId: number; attempt: number }
  | {
      status: "success";
      eventId: number;
      attempt: number;
      data: EventideEvent;
    }
  | {
      status: "error";
      eventId: number;
      attempt: number;
      message: string;
    };

export default function useEvent(eventId: number | null) {
  const [state, setState] = useState<RequestState>({
    status: "idle",
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (eventId === null) return;

    const controller = new AbortController();

    async function load() {
      try {
        const event = await getEvent(eventId!, controller.signal);

        if (controller.signal.aborted) return;

        setState({
          status: "success",
          eventId: eventId!,
          attempt,
          data: toEventideEvent(event),
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          eventId: eventId!,
          attempt,
          message:
            error instanceof Error ? error.message : "Failed to load event",
        });
      }
    }

    void load();

    return () => controller.abort();
  }, [eventId, attempt]);

  const isCurrent =
    state.status !== "idle" &&
    state.eventId === eventId &&
    state.attempt === attempt;

  return {
    event: isCurrent && state.status === "success" ? state.data : null,
    loading:
      eventId !== null &&
      !(isCurrent && (state.status === "success" || state.status === "error")),
    error: isCurrent && state.status === "error" ? state.message : null,
    retry: () => setAttempt((previous) => previous + 1),
  };
}
