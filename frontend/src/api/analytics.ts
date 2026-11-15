const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const ANALYTICS_URL = "/analytics";

async function sendAnalytics(
  path: string,
  accessToken: string,
  body?: object,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${ANALYTICS_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    throw new Error(`Analytics request failed: ${response.status}`);
  }
}

export function trackEventClick(
  eventId: number,
  accessToken: string,
): Promise<void> {
  return sendAnalytics(`/events/${eventId}/click`, accessToken);
}

export function trackTagClick(
  tagId: number,
  accessToken: string,
): Promise<void> {
  return sendAnalytics(`/tags/${tagId}/click`, accessToken);
}

export function trackSearch(query: string, accessToken: string): Promise<void> {
  query = query.trim();
  if (!query) {
    return Promise.resolve(); // No need to send analytics for empty queries
  }
  return sendAnalytics("/searches", accessToken, { query });
}
