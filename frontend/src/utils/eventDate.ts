export function formatEventDate(date?: string, timeKnown = true) {
  if (!date || Number.isNaN(Date.parse(date))) return "Date to be announced";
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeKnown
      ? { hour: "numeric" as const, minute: "2-digit" as const }
      : {}),
    timeZone: "America/Toronto",
  }).format(new Date(date));
}
