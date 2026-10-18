import TagLink from "./TagLink";
import type { EventideEvent } from "../interfaces/interfaces";

import { formatEventDate } from "../utils/eventDate";

type Props = {
  event: EventideEvent;
  compact?: boolean;
  saved: boolean;
  onOpen: (event: EventideEvent) => void;
  onSave: (id: number) => void;
};

export default function DiscoverEventCard({
  event,
  compact = false,
  saved,
  onOpen,
  onSave,
}: Props) {
  return (
    <article
      className={`event-card ${compact ? "event-card-compact" : "event-card-large"}`}
    >
      <button
        className="event-card-open"
        onClick={() => onOpen(event)}
        aria-label={`View ${event.title}`}
      >
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="event-image-placeholder" aria-hidden="true">
            ✦
          </span>
        )}
        <div className="event-card-copy">
          {compact && (
            <span className="event-date">
              {formatEventDate(event.startDate, event.startTimeKnown)}
            </span>
          )}
          <h3>{event.title}</h3>
          {!compact && <p>{event.description}</p>}
          {compact && (
            <span className="event-location">
              {event.venue.name || "Location to be announced"}
            </span>
          )}
        </div>
      </button>
      {!compact && (
        <div className="event-card-footer">
          <span>{formatEventDate(event.startDate, event.startTimeKnown)}</span>
          <span>{event.venue.name || "Location to be announced"}</span>
          <span className="event-tags">
            {event.tags.map((tag) => (
              <TagLink key={tag.id} tag={tag.name} />
            ))}
          </span>
        </div>
      )}
      <button
        className="event-save"
        aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
        aria-pressed={saved}
        onClick={() => onSave(event.id)}
      >
        {saved ? "★" : "☆"}
      </button>
    </article>
  );
}
