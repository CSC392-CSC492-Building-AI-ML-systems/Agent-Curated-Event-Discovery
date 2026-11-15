import { test, expect } from "@playwright/test";
import { createCalendarExport } from "../src/utils/calendarExport";
import type { EventideEvent } from "../src/interfaces/interfaces";

const base: EventideEvent = {
  key: 1,
  id: 1,
  title: "Music, art; Toronto",
  description: "First line\nSecond line",
  tags: [],
  startDate: "2026-11-03T15:00:00Z",
  endDate: "2026-11-03T17:00:00Z",
  startTimeKnown: true,
  endTimeKnown: true,
  venue: { id: 1, name: "Town Hall", address: "Toronto, ON", coordinates: null },
  link: "",
  eighteenPlus: false,
  likes: 0,
  saves: 0,
};

test("ICS preserves timed dates, location and escaped text", async () => {
  const { content } = await createCalendarExport([base]);
  expect(content).toContain("UID:event-1@eventide");
  expect(content).toContain("DTSTART:20261103T150000Z");
  expect(content).toContain("DTEND:20261103T170000Z");
  expect(content).toContain("LOCATION:Town Hall\\, Toronto\\, ON");
  expect(content).toContain("SUMMARY:Music\\, art\\; Toronto");
  expect(content).toContain("DESCRIPTION:First line\\nSecond line");
  // Toronto is UTC-4 in July and UTC-5 in November; retain each actual instant.
  const summer = await createCalendarExport([
    { ...base, startDate: "2026-07-03T14:00:00Z", endDate: "2026-07-03T16:00:00Z" },
  ]);
  expect(summer.content).toContain("DTSTART:20260703T140000Z");
});

test("ICS date-only entries use Toronto dates and exclusive all-day end dates", async () => {
  const { content } = await createCalendarExport([
    { ...base, startTimeKnown: false, endTimeKnown: false,
      startDate: "2026-11-05T05:00:00Z", endDate: "2026-11-06T05:00:00Z" },
    { ...base, id: 2, startTimeKnown: false, endDate: undefined },
  ]);
  expect(content).toContain("DTSTART;VALUE=DATE:20261105");
  expect(content).toContain("DTEND;VALUE=DATE:20261107");
  expect(content).toContain("DTSTART;VALUE=DATE:20261103");
  expect(content).toContain("DTEND;VALUE=DATE:20261104");
});

test("ICS excludes undated events without guessing unknown end times or locations", async () => {
  const { content, excludedCount } = await createCalendarExport([
    { ...base, endTimeKnown: false, endDate: undefined,
      venue: { ...base.venue, name: "", address: "" } },
    { ...base, id: 2, startDate: undefined },
    { ...base, id: 3, startDate: "invalid" },
  ]);
  expect(excludedCount).toBe(2);
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(content).not.toContain("DTEND");
  expect(content).not.toContain("LOCATION");
  await expect(createCalendarExport([{ ...base, startDate: undefined }])).rejects.toThrow("No calendar events");
});
