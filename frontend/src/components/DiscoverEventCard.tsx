import TagLink from "./TagLink";
import type { EventideEvent } from "../interfaces/interfaces";
import SaveIcon from '../assets/images/save-icon.svg?react';
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import HeartIcon from '../assets/images/heart-icon.svg?react';
import HeartIconFilled from '../assets/images/heart-icon-filled.svg?react';

import { formatEventDate } from "../utils/eventDate";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const { session } = useAuth();
  const navigate = useNavigate();
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
            onClick={() => {if (session?.access_token) {onLike(event.id)} else {navigate("/login")}}}
          >
            {liked? <HeartIconFilled color="#f6545c" className="icon"/>: <HeartIcon color="#f6545c" className="icon"/>}
          </button>
          {!compact && event.likes > 0 && <p className="mini-text">{event.likes}</p>}
        </div>
        <button
          className="event-save"
          aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
          aria-pressed={saved}
          onClick={() => {if (session?.access_token) {onSave(event.id)} else {navigate("/login")}}}
        >
          {saved? <SaveIconFilled color="#f6545c" className="icon"/>: <SaveIcon color="#f6545c" className="icon"/>}
        </button>
      </div>
    </article>
  );
}
