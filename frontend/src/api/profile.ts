import { requestJson } from "./client";
import type { RequestOptions } from "./types";

export type ProfileUpdate = { first_name: string | null; last_name: string | null; username: string | null };
export type UserProfile = ProfileUpdate & { updated_at: string | null };
const PATH = "/users/me/profile";

export function getProfile(accessToken: string, options: RequestOptions = {}) {
  return requestJson<UserProfile>(PATH, { ...options, accessToken });
}

export function saveProfile(profile: ProfileUpdate, accessToken: string, options: RequestOptions = {}) {
  return requestJson<UserProfile>(PATH, { ...options, accessToken, method: "PUT", body: profile });
}
