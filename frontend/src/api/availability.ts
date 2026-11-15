import { requestJson } from "./client";
import type { WeeklyAvailability } from "./availabilityTypes";
import type { RequestOptions } from "./types";
import { normalizeAvailability } from "../utils/availability";

const PATH = "/users/me/availability";

export async function getAvailability(accessToken: string, options: RequestOptions = {}) {
  const result = await requestJson<WeeklyAvailability>(PATH, { ...options, accessToken });
  return normalizeAvailability(result);
}

export async function saveAvailability(
  schedule: WeeklyAvailability,
  accessToken: string,
  options: RequestOptions = {},
) {
  const result = await requestJson<WeeklyAvailability>(PATH, {
    ...options, accessToken, method: "PUT", body: normalizeAvailability(schedule),
  });
  return normalizeAvailability(result);
}
