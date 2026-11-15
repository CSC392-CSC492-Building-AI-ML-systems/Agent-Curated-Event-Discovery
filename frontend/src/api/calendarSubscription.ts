import { requestJson } from "./client";
import type { RequestOptions } from "./types";

export type CalendarSubscriptionStatus = {
  enabled: boolean;
  created_at: string | null;
};

export type CalendarSubscriptionCreated = CalendarSubscriptionStatus & {
  subscription_url: string;
};

const PATH = "/users/me/calendar-subscription";

export function getCalendarSubscription(accessToken: string, options: RequestOptions = {}) {
  return requestJson<CalendarSubscriptionStatus>(PATH, { ...options, accessToken });
}

export function createCalendarSubscription(accessToken: string, options: RequestOptions = {}) {
  return requestJson<CalendarSubscriptionCreated>(PATH, { ...options, accessToken, method: "POST" });
}

export function disableCalendarSubscription(accessToken: string, options: RequestOptions = {}) {
  return requestJson<void>(PATH, { ...options, accessToken, method: "DELETE" });
}
