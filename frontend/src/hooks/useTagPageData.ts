import { useEffect, useState } from "react";
import { getTag, getTagEvents } from "../api/tags";
import { toEventideEvent } from "../api/adapters";
import type { EventideEvent, EventideTag } from "../interfaces/interfaces";

interface TagPageData {
  tag: EventideTag | null;
  events: EventideEvent[];
}

type RequestState =
  | { status: "idle" }
  | { status: "loading"; tagId: number; attempt: number }
  | {
      status: "success";
      tagId: number;
      attempt: number;
      data: TagPageData;
    }
  | {
      status: "error";
      tagId: number;
      attempt: number;
      message: string;
    };

export default function useTagPageData(tagId: number | null) {
  const [state, setState] = useState<RequestState>({
    status: "idle",
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (tagId === null) return;

    const controller = new AbortController();

    async function load() {
      try {
        const [tag, apiEvents] = await Promise.all([
          getTag(tagId!, controller.signal),
          getTagEvents(tagId!, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setState({
          status: "success",
          tagId: tagId!,
          attempt,
          data: {
            tag,
            events: apiEvents.map(toEventideEvent),
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          tagId: tagId!,
          attempt,
          message:
            error instanceof Error ? error.message : "Failed to load tag page",
        });
      }
    }

    void load();

    return () => controller.abort();
  }, [tagId, attempt]);

  const isCurrent =
    state.status !== "idle" &&
    state.tagId === tagId &&
    state.attempt === attempt;

  return {
    tag: isCurrent && state.status === "success" ? state.data.tag : null,
    events: isCurrent && state.status === "success" ? state.data.events : [],
    loading:
      tagId !== null &&
      !(isCurrent && (state.status === "success" || state.status === "error")),
    error: isCurrent && state.status === "error" ? state.message : null,
    retry: () => setAttempt((previous) => previous + 1),
  };
}
