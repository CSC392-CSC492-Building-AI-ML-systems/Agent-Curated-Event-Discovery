import { requestJson } from "./client";
import type { ApiEvent, RequestOptions } from "./types";

export function getRecommendedEvents(accessToken: string, options: RequestOptions = {}) {
  return requestJson<ApiEvent[]>("/users/me/recommended-events", { ...options, accessToken });
}

export function rejectRecommendedEvent(eventId: number, accessToken: string, options: RequestOptions = {}) {
  return requestJson<{ event_id: number; rejected: boolean }>(
    `/users/me/recommended-events/${eventId}/rejected`,
    { ...options, method: "PUT", accessToken },
  );
}
