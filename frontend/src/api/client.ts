import type { RequestOptions } from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  if (
    body !== null &&
    typeof body === "object" &&
    "detail" in body &&
    typeof body.detail === "string"
  ) {
    return body.detail;
  }

  if (body && typeof body === "object" && "detail" in body && Array.isArray(body.detail)) {
    const messages = body.detail.flatMap(item =>
      item && typeof item === "object" && "msg" in item && typeof item.msg === "string" ? [item.msg] : []);
    if (messages.length) return messages.join(". ");
  }

  return `Request failed (${status})`;
}

export async function requestJson<T>(
  path: string,
  { signal, method = "GET", body, accessToken }: RequestOptions & {
    method?: "GET" | "PUT";
    body?: unknown;
    accessToken?: string;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error responses still retain their HTTP status.
    }
    throw new ApiError(response.status, getErrorMessage(body, response.status));
  }

  // These types describe the expected response; they don't validate JSON at runtime.
  return response.json() as Promise<T>;
}

export function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestJson<T>(path, options);
}
