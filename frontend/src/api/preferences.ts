import { requestJson } from "./client";
import type { RequestOptions } from "./types";

export type AgeGroup = "20_29" | "30_39" | "40_49" | "50_59" | "60_69" | "70_79" | "80_plus";
export type Budget = "free" | "under_25" | "25_to_50" | "50_to_100" | "100_to_200" | "over_200";
export type PreferencesInput = { age_group: AgeGroup | null; budget: Budget | null; interest_tag_ids: number[] };
export type Preferences = PreferencesInput & { onboarding_completed: boolean };

export function getPreferences(accessToken: string, options: RequestOptions = {}) {
  return requestJson<Preferences>("/users/me/preferences", { ...options, accessToken });
}

export function savePreferences(payload: PreferencesInput, accessToken: string, options: RequestOptions = {}) {
  return requestJson<Preferences>("/users/me/preferences", { ...options, method: "PUT", body: payload, accessToken });
}
