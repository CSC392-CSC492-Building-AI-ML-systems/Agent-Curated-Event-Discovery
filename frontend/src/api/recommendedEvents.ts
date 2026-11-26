import { requestJson } from "./client";
import type { ApiRecommendedEvent, RequestOptions } from "./types";

export function getRecommendedEvents(accessToken: string, options: RequestOptions = {}) {
  return requestJson<ApiRecommendedEvent[]>("/users/me/recommended-events", { ...options, accessToken });
}

export function rejectRecommendedEvent(eventId: number, accessToken: string, options: RequestOptions = {}) {
  return requestJson<{ event_id: number; rejected: boolean }>(
    `/users/me/recommended-events/${eventId}/rejected`,
    { ...options, method: "PUT", accessToken },
  );
}
