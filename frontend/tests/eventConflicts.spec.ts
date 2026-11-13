import { test, expect } from "@playwright/test";
import { findEventConflicts } from "../src/utils/eventConflicts";

function timed(id: number, startDate: string, endDate: string) {
  return { id, startDate, endDate, startTimeKnown: true, endTimeKnown: true };
}

test("overlap handles containment, touching boundaries, unknown times and UTC offsets", () => {
  const event = timed(1, "2026-11-03T10:00:00-05:00", "2026-11-03T12:00:00-05:00");
  const others = [
    timed(2, "2026-11-03T16:00:00Z", "2026-11-03T18:00:00Z"),
    timed(3, "2026-11-03T14:00:00Z", "2026-11-03T19:00:00Z"),
    timed(4, "2026-11-03T17:00:00Z", "2026-11-03T18:00:00Z"),
    { ...event, id: 5, endTimeKnown: false },
    { ...event, id: 6, endDate: "invalid" },
    { ...event, id: 7, endDate: event.startDate },
    event,
  ];
  expect(findEventConflicts(event, others).map(item => item.id)).toEqual([2, 3]);
  expect(findEventConflicts({ ...event, startTimeKnown: false }, others)).toEqual([]);
});

test("overlap includes events that cross midnight", () => {
  const event = timed(8, "2026-11-03T23:00:00-05:00", "2026-11-04T02:00:00-05:00");
  const overnight = timed(9, "2026-11-04T01:00:00-05:00", "2026-11-04T03:00:00-05:00");
  expect(findEventConflicts(event, [overnight])).toEqual([overnight]);
});
