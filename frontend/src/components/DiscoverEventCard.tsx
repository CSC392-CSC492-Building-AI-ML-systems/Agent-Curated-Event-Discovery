import TagLink from "./TagLink";
import type { EventideEvent } from "../interfaces/interfaces";
import saveIcon from "../assets/images/save-icon-pink.svg";
import saveIconFilled from "../assets/images/save-icon-filled-pink.svg";
import heartIcon from "../assets/images/heart-icon-pink.svg";
import heartIconFilled from "../assets/images/heart-icon-filled-pink.svg";

import { formatEventDate } from "../utils/eventDate";

type Props = {
  event: EventideEvent;
  compact?: boolean;
  saved: boolean;
  onSave: (id: number) => void;
  liked: boolean;
  onLike: (id: number) => void;
  onOpen: (event: EventideEvent) => void;
};

export default function DiscoverEventCard({
  event,
  compact = false,
  saved,
  onSave,
  liked, 
  onLike,
  onOpen,
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
          {<h3>{event.title}</h3>}
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
          <div className="event-tags row small-gap">
            {event.tags.map((tag) => (
              <TagLink key={tag.id} tag={tag} />
            ))}
          </div>
        </div>
      )}
      <div className="event-actions">
        <div className="event-like-wrap">
          <button
            className="event-like"
            aria-label={`${liked ? "Unlike" : "Like"} ${event.title}`}
            aria-pressed={liked}
            onClick={() => onLike(event.id)}
          >
            <img className="icon" src={liked ? heartIconFilled: heartIcon } alt="likes" />
          </button>
          {!compact && <p className="mini-text">{event.likes}</p>}
        </div>
        <button
          className="event-save"
          aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
          aria-pressed={saved}
          onClick={() => onSave(event.id)}
        >
          <img className="icon" src={saved ? saveIconFilled: saveIcon} alt="likes" />
        </button>
      </div>
    </article>
  );
}
