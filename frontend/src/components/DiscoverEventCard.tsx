import TagLink from "./TagLink";
import type { EventideEvent } from "../interfaces/interfaces";
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import HeartIconFilled from '../assets/images/heart-icon-filled.svg?react';
import { useAnalytics } from "../hooks/useAnalytics";

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
  // Only recommended events pass this so the reject button not on regular upcoming section events
  onReject?: (id: number) => void;
};

export default function DiscoverEventCard({
  event,
  compact = false,
  saved,
  onSave,
  liked, 
  onLike,
  onOpen,
  onReject,
}: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { logEventClick } = useAnalytics();
  const handleEventOpen = (event: EventideEvent) => {
    onOpen(event);

    void logEventClick(Number(event.id)).catch((error) => {
      console.error("Failed to track event click:", error);
    });
  };
  const showPrice = event.price && event.price != 0
  return (
    <article
      className={`event-card ${compact ? "event-card-compact" : "event-card-large"}`}
    >
      <button
        className="event-card-open"
        onClick={() => handleEventOpen(event)}
        aria-label={`View ${event.title}`}
      >
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="event-image-placeholder" aria-hidden="true">
            {!compact?
            <div className="row tiny-gap" style={{position: "absolute", left: 10, top: 10}}>             
              { event.eighteenPlus? 
                <span className="pill2invert">
                  18+
                </span>: <></>
              }
              { showPrice? 
                <span className="pill2" >
                  ${event.price}
                </span>: <></>
              }
            </div>: <></>}
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
        {compact?
        <div className="row tiny-gap" style={{position: "absolute", right: 10, bottom: 10}}>             
          { event.eighteenPlus? 
            <span className="pill2invert" style={{fontSize: "11px", lineHeight: "11px"}}>
              18+
            </span>: <></>
          }
          { showPrice? 
            <span className="pill2" style={{fontSize: "11px", lineHeight: "11px"}}>
              ${event.price}
            </span>: <></>
          }
        </div>: <></>}
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
            {liked? <HeartIconFilled fill="#f6545c" stroke="#f6545c" className="icon"/>: <HeartIconFilled fill="white" stroke="#f6545c" className="icon"/>}
          </button>
          {!compact && event.likes > 0 && <p className="mini-text">{event.likes}</p>}
        </div>
        <button
          className="event-save"
          aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
          aria-pressed={saved}
          onClick={() => {if (session?.access_token) {onSave(event.id)} else {navigate("/login")}}}
        >
          {saved? <SaveIconFilled fill="#f6545c" stroke="#f6545c" className="icon"/>: <SaveIconFilled fill="white" stroke="#f6545c" className="icon"/>}
        </button>
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
