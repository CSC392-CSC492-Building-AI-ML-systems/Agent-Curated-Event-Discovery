import { requestJson } from "./client";
import type { ApiEvent, GetEventsOptions, RequestOptions } from "./types";
export type LikeAndSaveInput = { id: number };

export function getEventsLiked({
  skip,
  limit,
  signal,
  accessToken
}: GetEventsOptions & {accessToken?: string} = {}): Promise<ApiEvent[]> {
  const params = new URLSearchParams();
  if (skip !== undefined) {
    if (!Number.isInteger(skip) || skip < 0)
      throw new RangeError("skip must be a non-negative integer");
    params.set("skip", String(skip));
  }
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new RangeError("limit must be an integer from 1 to 100");
    params.set("limit", String(limit));
  }
  const query = params.toString();
  return requestJson<ApiEvent[]>(`/users/me/likes${query ? `?${query}` : ""}`, { signal, accessToken: accessToken });
}

export function getEventsSaved({
  skip,
  limit,
  signal,
  accessToken
}: GetEventsOptions & {accessToken?: string} = {}): Promise<ApiEvent[]> {
  const params = new URLSearchParams();
  if (skip !== undefined) {
    if (!Number.isInteger(skip) || skip < 0)
      throw new RangeError("skip must be a non-negative integer");
    params.set("skip", String(skip));
  }
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new RangeError("limit must be an integer from 1 to 100");
    params.set("limit", String(limit));
  }
  const query = params.toString();
  return requestJson<ApiEvent[]>(`/users/me/saves${query ? `?${query}` : ""}`, { signal, accessToken: accessToken });
}

export function eventLiked(method: "PUT" | "DELETE", payload: LikeAndSaveInput, accessToken: string, options: RequestOptions = {}) {
  return requestJson<LikeAndSaveInput>("/users/me/like", { ...options, method: method, body: payload, accessToken: accessToken  });
}

export function eventSaved(method: "PUT" | "DELETE", payload: LikeAndSaveInput, accessToken: string, options: RequestOptions = {}) {
  return requestJson<LikeAndSaveInput>("/users/me/save", { ...options, method: method, body: payload, accessToken: accessToken  });
}

