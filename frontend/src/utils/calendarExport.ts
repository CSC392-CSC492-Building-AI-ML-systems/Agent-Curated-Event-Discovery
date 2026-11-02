import type { EventAttributes } from "ics";
import type { EventideEvent } from "../interfaces/interfaces";
import { eventDayKey } from "./calendar";

type DatedEvent = EventideEvent & { startDate: string };

export function hasExportableDate(event: EventideEvent): event is DatedEvent {
  return typeof event.startDate === "string" && Number.isFinite(Date.parse(event.startDate));
}

function dateOnly(timestamp: string): [number, number, number] {
  const [year, month, day] = eventDayKey(timestamp).split("-").map(Number);
  return [year, month, day];
}

function toCalendarEntry(event: DatedEvent): EventAttributes {
  const start = Date.parse(event.startDate);
  const end = Date.parse(event.endDate ?? "");
  const location = [...new Set(
    [event.venue.name, event.venue.address].map(value => value?.trim()).filter(Boolean),
  )].join(", ");
  const details = {
    uid: `event-${event.id}@eventide`,
    title: event.title,
    description: event.description,
    ...(location ? { location } : {}),
  };

  if (event.startTimeKnown) {
    return {
      ...details,
      start,
      startInputType: "utc",
      startOutputType: "utc",
      // Zero duration preserves a known start without guessing an end time.
      ...(event.endTimeKnown && end > start ? { end } : { duration: { minutes: 0 } }),
    };
  }
  // ICS all-day end dates are exclusive; source event dates are inclusive.
  const lastDay = dateOnly(event.endDate && end >= start ? event.endDate : event.startDate);
  const followingDay = new Date(Date.UTC(lastDay[0], lastDay[1] - 1, lastDay[2] + 1));
  return {
    ...details,
    start: dateOnly(event.startDate),
    end: [followingDay.getUTCFullYear(), followingDay.getUTCMonth() + 1, followingDay.getUTCDate()],
  };
}

export async function createCalendarExport(events: readonly EventideEvent[]) {
  const dated = events.filter(hasExportableDate);
  if (!dated.length) throw new Error("No saved events have a start date to export.");

  // Keep the formatter and its dependencies out of the initial page download.
  const { createEvents } = await import("ics");
  const { error, value } = createEvents(dated.map(toCalendarEntry));
  if (error || !value) throw new Error("Unable to export events. Please try again.");
  return { content: value, excludedCount: events.length - dated.length };
}

export function downloadCalendar(content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "eventide-events.ics";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Give the browser time to start the download before releasing the blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
