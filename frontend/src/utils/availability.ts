import type { AvailabilityWindow, WeeklyAvailability } from "../api/availabilityTypes";
import { AVAILABILITY_DAYS, MINUTES_PER_DAY, MINUTES_PER_SLOT, SLOTS_PER_DAY } from "../data/availability";

const TOTAL_SLOTS = AVAILABILITY_DAYS.length * SLOTS_PER_DAY;

/** Canonical API shape: ordered, with overlapping/adjacent windows merged per day. */
export function normalizeAvailability(value: WeeklyAvailability): WeeklyAvailability {
  if (!Array.isArray(value.windows) || value.windows.length > TOTAL_SLOTS) {
    throw new Error("Invalid weekly availability.");
  }
  for (const window of value.windows) {
    if (!window || !Number.isInteger(window.day_of_week) || window.day_of_week < 0 || window.day_of_week > 6
      || !Number.isInteger(window.start_minute) || !Number.isInteger(window.end_minute)
      || window.start_minute < 0 || window.end_minute > MINUTES_PER_DAY
      || window.start_minute >= window.end_minute
      || window.start_minute % MINUTES_PER_SLOT !== 0 || window.end_minute % MINUTES_PER_SLOT !== 0) {
      throw new Error("Availability windows must use Sunday–Saturday (0–6) and valid 30-minute ranges.");
    }
  }
  const ordered = value.windows.map(window => ({ ...window })).sort((a, b) =>
    a.day_of_week - b.day_of_week || a.start_minute - b.start_minute || a.end_minute - b.end_minute);
  const windows: AvailabilityWindow[] = [];
  for (const window of ordered) {
    const previous = windows.at(-1);
    if (previous && previous.day_of_week === window.day_of_week && window.start_minute <= previous.end_minute) {
      previous.end_minute = Math.max(previous.end_minute, window.end_minute);
    } else windows.push(window);
  }
  return { windows };
}

/** Convert selector cell IDs into ranges without exposing the cell encoding to the API. */
export function selectionToAvailability(selection: ReadonlySet<number>): WeeklyAvailability {
  for (const id of selection) {
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_SLOTS) throw new Error("Invalid availability slot.");
  }
  const windows: AvailabilityWindow[] = [];
  for (const { value: day } of AVAILABILITY_DAYS) {
    let start: number | null = null;
    for (let slot = 0; slot <= SLOTS_PER_DAY; slot++) {
      const selected = slot < SLOTS_PER_DAY && selection.has(day * SLOTS_PER_DAY + slot);
      if (selected && start === null) start = slot;
      if (!selected && start !== null) {
        windows.push({ day_of_week: day, start_minute: start * MINUTES_PER_SLOT, end_minute: slot * MINUTES_PER_SLOT });
        start = null;
      }
    }
  }
  return normalizeAvailability({ windows });
}

/** Restore API ranges to cells; midnight-ending windows stay on their source day. */
export function availabilityToSelection(value: WeeklyAvailability): Set<number> {
  const { windows } = normalizeAvailability(value);
  const selection = new Set<number>();
  for (const window of windows) {
    for (let minute = window.start_minute; minute < window.end_minute; minute += MINUTES_PER_SLOT) {
      selection.add(window.day_of_week * SLOTS_PER_DAY + minute / MINUTES_PER_SLOT);
    }
  }
  return selection;
}
