import { requestJson } from "./client";
import type { RequestOptions } from "./types";

export function getAccountSecurity(accessToken: string, options: RequestOptions = {}) {
  return requestJson<{ has_password: boolean }>("/users/me/account/security", { ...options, accessToken });
}

export function deleteAccount(accessToken: string, options: RequestOptions = {}) {
  return requestJson<void>("/users/me/account", { ...options, method: "DELETE", accessToken });
}
