import type { EventideEvent } from "../interfaces/interfaces";
import { toTorontoTimestamp } from "../utils/torontoTime";
import type { ApiEvent } from "./types";

function combineDateAndTime(
  date: string | null,
  time: string | null,
): string | undefined {
  if (date === null) return undefined;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("The events API must return dates as YYYY-MM-DD");
  }
  // Midnight anchors a date to Toronto; startTimeKnown/endTimeKnown keep it
  // from being displayed as an actual event time when the API time is null.
  return toTorontoTimestamp(`${date}T${time ?? "00:00:00"}`);
}

export function toEventideEvent(event: ApiEvent): EventideEvent {
  const tags = event.tags?.map((tag) => ({ id: tag.id, name: tag.name }));
  return {
    key: event.id,
    id: event.id,
    title: event.name,
    description: event.description,
    startDate: combineDateAndTime(event.startdate, event.starttime),
    endDate: combineDateAndTime(event.enddate, event.endtime),
    startTimeKnown: event.starttime != null,
    endTimeKnown: event.endtime != null,
    venue: event.venue,
    organizer: event.organizer,
    price: event.price,
    link: event.link,
    eighteenPlus: event.eighteenplus,
    tags,
    categories: [...new Set((tags ?? []).map((tag) => tag.name))],
    latitude: event.venue.coordinates?.coordinates[1],
    longitude: event.venue.coordinates?.coordinates[0],
    // Address, image, and coordinates aren't supplied by these endpoints yet.
  };
}
