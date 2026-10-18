import type { EventideTag } from "../interfaces/interfaces";
import { getJson } from "./client";
import type { ApiEvent, ApiTag, RequestOptions } from "./types";

export function getTags(options: RequestOptions = {}): Promise<ApiTag[]> {
  return getJson<ApiTag[]>("/tags", options);
}

export function getTag(id: number, signal?: AbortSignal): Promise<EventideTag> {
  return getJson<EventideTag>(`/tags/${encodeURIComponent(String(id))}`, {
    signal,
  });
}

export function getTagEvents(
  id: number,
  signal?: AbortSignal,
): Promise<ApiEvent[]> {
  return getJson<ApiEvent[]>(`/tags/${encodeURIComponent(String(id))}/events`, {
    signal,
  });
}
