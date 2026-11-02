import type { EventideEvent } from "../interfaces/interfaces";

type EventTime = Pick<EventideEvent, "id" | "startDate" | "endDate" | "startTimeKnown" | "endTimeKnown">;

function interval(event: EventTime): [number, number] | null {
  // Date-only values are anchored at midnight by the API adapter, not real times.
  if (!event.startTimeKnown || !event.endTimeKnown) return null;
  const start = Date.parse(event.startDate ?? "");
  const end = Date.parse(event.endDate ?? "");
  return Number.isFinite(start) && Number.isFinite(end) && start < end
    ? [start, end]
    : null;
}

export function findEventConflicts<T extends EventTime>(event: EventTime, scheduled: T[]): T[] {
  const candidate = interval(event);
  if (!candidate) return [];
  return scheduled.filter(existing => {
    if (existing.id === event.id) return false;
    const other = interval(existing);
    return other !== null && candidate[0] < other[1] && other[0] < candidate[1];
  });
}
