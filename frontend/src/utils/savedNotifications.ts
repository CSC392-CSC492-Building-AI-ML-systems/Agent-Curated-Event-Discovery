import { eventDayKey } from "./calendar";
import type { EventideEvent } from "../interfaces/interfaces";

export type SavedNotification = {
  event: EventideEvent;
  label: "Today" | "Tomorrow" | "1 Week Away";
};

const dayNumber = (iso: string) =>
  Date.parse(`${eventDayKey(iso)}T00:00:00Z`) / 86_400_000;

export default function savedNotifications(
  events: EventideEvent[],
  saved: number[],
  now = Date.now(),
): SavedNotification[] {
  const today = dayNumber(new Date(now).toISOString());

  return events
    .filter((event) => saved.includes(event.id) && event.startDate)
    .flatMap((event) => {
      const days = dayNumber(event.startDate!) - today;
      const label =
        days === 0
          ? "Today"
          : days === 1
            ? "Tomorrow"
            : days === 6 || days === 7
              ? "1 Week Away"
              : null;
      return label ? [{ event, label } as SavedNotification] : [];
    })
    .sort(
      (a, b) => Date.parse(a.event.startDate!) - Date.parse(b.event.startDate!),
    );
}
