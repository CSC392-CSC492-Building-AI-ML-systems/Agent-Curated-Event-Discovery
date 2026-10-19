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

  return `Request failed (${status})`;
}

export async function getJson<T>(
  path: string,
  { signal }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
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
