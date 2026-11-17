import TagLink from "./TagLink";
import CalendarEventButton from "./CalendarEventButton";
import type { EventideEvent } from "../interfaces/interfaces";
import SaveIcon from '../assets/images/save-icon.svg?react';
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import { useAnalytics } from "../hooks/useAnalytics";

import { formatEventDate } from "../utils/eventDate";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Props = {
  event: EventideEvent;
  compact?: boolean;
  saved: boolean;
  onSave: (id: number) => void;
  onOpen: (event: EventideEvent) => void;
  // Only recommended events pass this so the reject button not on regular upcoming section events
  onReject?: (id: number) => void;
  isRecommended?: boolean;
  redirect: boolean;
};

export default function DiscoverEventCard({
  event,
  compact = false,
  saved,
  onSave,
  onOpen,
  onReject,
  isRecommended,
  redirect,
}: Props) {
    const { logEventClick } = useAnalytics();
    const { session } = useAuth();
    const navigate = useNavigate();
    const navigateToEvent = () => {
      //first log the event click
      void logEventClick(Number(event.id)).catch((error) => {
        console.error("Failed to track event click:", error);
      });
      if (isRecommended && redirect) {
        navigate(`/events/${event.id}`, { state: { origin: { path: "/discover" }, isRecommended: true } });
      }
      else if (redirect) {
        navigate(`/events/${event.id}`, { state: { origin: { path: "/discover" } } });
      }
      else {
        onOpen(event);
      }
    };
  return (
    <article
      className={`event-card ${compact ? "event-card-compact" : "event-card-large"}`}
    >
      <button
        className="event-card-open"
        onClick={navigateToEvent}
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
        <div className="event-save-wrap">
          <button
            className="event-save"
            aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
            aria-pressed={saved}
            onClick={() => {if (session?.access_token) {onSave(event.id)} else {navigate("/login")}}}
          >
            {saved? <SaveIconFilled color="#f6545c" className="icon"/>: <SaveIcon color="#f6545c" className="icon"/>}
          </button>
          {!compact && event.saves > 0 && <p className="mini-text">{event.saves}</p>}
        </div>
        <CalendarEventButton event={event} />
        {onReject && (
          <button
            className="event-save event-reject"
            aria-label={`Not interested in ${event.title}`}
            onClick={() => onReject(event.id)}
          >
            ✕
          </button>
        )}
      </div>
    </article>
  );
}
