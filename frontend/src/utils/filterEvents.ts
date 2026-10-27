import type { EventideEvent, BrowseState } from "../interfaces/interfaces";
import { eventDayKey } from "./calendar";

export default function filterEvents(
  events: EventideEvent[],
  browse: BrowseState,
  now = Date.now(),
): EventideEvent[] {
  const { search, range, sort, tags } = browse;
  const query = search.trim().toLowerCase();
  const today = eventDayKey(new Date(now).toISOString());

  return events
    .filter((event) => {
      const date = event.startDate ? Date.parse(event.startDate) : null;

      const isTodayWithoutTime =
        event.startTimeKnown === false &&
        event.startDate &&
        eventDayKey(event.startDate) === today;

      const matchesDate =
        range === "all-dates" ||
        date === null ||
        (date !== null &&
          !Number.isNaN(date) &&
          date >= now &&
          (range === "all" || date <= now + Number(range) * 86_400_000)) ||
        isTodayWithoutTime;

      const searchableText = [
        event.title,
        event.description,
        event.venue.address,
        event.venue.name,
        event.organizer?.name,
        ...event.tags.map((tag) => tag.name),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesTags =
        tags.length === 0 ||
        event.tags.some((eventTag) =>
          tags.some((selectedTag) => selectedTag.id === eventTag.id),
        );

      return matchesDate && matchesSearch && matchesTags;
    })
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (Date.parse(a.startDate || "") || 0) -
          (Date.parse(b.startDate || "") || 0),
    );
}
