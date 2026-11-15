import { requestJson } from "./client";
import { toEventideEvent } from "./adapters";
import type { ApiEvent, RequestOptions } from "./types";
import type { EventideEvent } from "../interfaces/interfaces";

type CalendarResponse = { id: number; message: string };
const PAGE_SIZE = 100;

export async function loadCalendar(accessToken: string, options: RequestOptions = {}) {
  const events = new Map<number, EventideEvent>();
  for (let skip = 0; ; skip += PAGE_SIZE) {
    options.signal?.throwIfAborted();
    const page = await requestJson<ApiEvent[]>(
      `/users/me/calendar?skip=${skip}&limit=${PAGE_SIZE}`,
      { ...options, accessToken },
    );
    if (!Array.isArray(page)) throw new Error("The calendar API returned an unexpected response.");
    for (const event of page) events.set(event.id, toEventideEvent(event));
    if (page.length < PAGE_SIZE) return [...events.values()];
  }
}

export function updateCalendar(
  id: number,
  method: "PUT" | "DELETE",
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<CalendarResponse>("/users/me/calendar", {
    ...options, method, body: { id }, accessToken,
  });
}
