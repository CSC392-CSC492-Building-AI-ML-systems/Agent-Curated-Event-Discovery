import { createClient } from "./client";

export async function calendarAccessToken(userId: string) {
  const { data, error } = await createClient().auth.getSession();
  if (error || data.session?.user.id !== userId) {
    throw new Error("Please log in again before changing your calendar.");
  }
  return data.session.access_token;
}
