import { createClient } from "./client";

export async function userAccessToken(userId: string, message = "Please log in again to continue.") {
  const { data, error } = await createClient().auth.getSession();
  if (error || data.session?.user.id !== userId) {
    throw new Error(message);
  }
  return data.session.access_token;
}

export function calendarAccessToken(userId: string) {
  return userAccessToken(userId, "Please log in again before changing your calendar.");
}
