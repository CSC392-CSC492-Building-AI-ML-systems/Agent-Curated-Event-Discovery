import { test, expect } from "@playwright/test";
import { availabilityToSelection, normalizeAvailability, selectionToAvailability } from "../src/utils/availability";
import type { WeeklyAvailability } from "../src/api/availabilityTypes";

test("selection serializes separate Monday ranges and restores the same slots", () => {
  const slots = new Set([66, 67, 68, 69, 70, 71, 78, 79]);
  const payload = selectionToAvailability(slots);
  expect(payload).toEqual({ windows: [
    { day_of_week: 1, start_minute: 540, end_minute: 720 },
    { day_of_week: 1, start_minute: 900, end_minute: 960 },
  ] });
  expect(availabilityToSelection(payload)).toEqual(slots);
});

test("Sunday zero, Saturday six and midnight boundaries are preserved", () => {
  const slots = new Set([0, 47, 288, 335]);
  const payload = selectionToAvailability(slots);
  expect(payload.windows).toEqual([
    { day_of_week: 0, start_minute: 0, end_minute: 30 },
    { day_of_week: 0, start_minute: 1410, end_minute: 1440 },
    { day_of_week: 6, start_minute: 0, end_minute: 30 },
    { day_of_week: 6, start_minute: 1410, end_minute: 1440 },
  ]);
  expect(availabilityToSelection(payload)).toEqual(slots);
  const fullWeek = new Set(Array.from({ length: 336 }, (_, id) => id));
  expect(selectionToAvailability(fullWeek).windows).toHaveLength(7);
  expect(availabilityToSelection(selectionToAvailability(fullWeek))).toEqual(fullWeek);
});

test("normalization merges only overlapping or adjacent ranges on the same day", () => {
  const input: WeeklyAvailability = { windows: [
    { day_of_week: 2, start_minute: 0, end_minute: 30 },
    { day_of_week: 1, start_minute: 600, end_minute: 660 },
    { day_of_week: 1, start_minute: 540, end_minute: 630 },
    { day_of_week: 1, start_minute: 660, end_minute: 720 },
    { day_of_week: 1, start_minute: 900, end_minute: 960 },
  ] };
  const copy = structuredClone(input);
  expect(normalizeAvailability(input)).toEqual({ windows: [
    { day_of_week: 1, start_minute: 540, end_minute: 720 },
    { day_of_week: 1, start_minute: 900, end_minute: 960 },
    { day_of_week: 2, start_minute: 0, end_minute: 30 },
  ] });
  expect(input).toEqual(copy);
});

test("empty schedules apply no availability preference; invalid ranges are rejected", () => {
  expect(selectionToAvailability(new Set())).toEqual({ windows: [] });
  for (const id of [-1, 336, 0.5, NaN]) expect(() => selectionToAvailability(new Set([id]))).toThrow();
  for (const changes of [
    { day_of_week: -1 }, { day_of_week: 7 }, { day_of_week: true },
    { start_minute: 15 }, { start_minute: -30 }, { end_minute: 1470 },
    { start_minute: 600, end_minute: 600 }, { start_minute: 1410, end_minute: 30 },
  ]) {
    const input = { windows: [{ day_of_week: 0, start_minute: 0, end_minute: 30, ...changes }] };
    expect(() => availabilityToSelection(input as WeeklyAvailability)).toThrow();
  }
});
