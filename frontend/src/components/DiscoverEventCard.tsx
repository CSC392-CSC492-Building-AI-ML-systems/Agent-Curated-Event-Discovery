import TagLink from "./TagLink";
import CalendarEventButton from "./CalendarEventButton";
import type { EventideEvent } from "../interfaces/interfaces";
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import { useAnalytics } from "../hooks/useAnalytics";

import { formatEventDate } from "../utils/eventDate";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";


const formatRecommendedReason = (recommendedReason: string, recommendedReasonDetail: string | null) =>{
  let recommendedExplanation = "";
  if (recommendedReason == "tag"){
    if (recommendedExplanation == null){
      recommendedExplanation = "At a good time for you"
    }else{
      recommendedExplanation = `Because you like #${recommendedReasonDetail}`
    }
  }else if (recommendedReason == "location"){
    if (recommendedExplanation == null){
      recommendedExplanation = "At a good spot for you"
    }else{
      recommendedExplanation = `For when you're in ${recommendedReasonDetail}`
    }
  }else if (recommendedReason == "budget"){
    if (recommendedExplanation == null){
      recommendedExplanation = "Within your budget"
    }
  }else if (recommendedReason == "pastevents"){
    if (recommendedExplanation == null){
      recommendedExplanation = "Similar to past saved events"
    } else {
      recommendedExplanation = `Similar to ${recommendedReasonDetail}`
    }
  }else if (recommendedReason == "age"){
    if (recommendedExplanation == null){
      recommendedExplanation = "Others your age liked"
    } 
  }else if (recommendedReason == "time"){
    if (recommendedExplanation == null){
      recommendedExplanation = "At a good time for you"
    } 
  }
  return recommendedExplanation;
}

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
  recommendedReason?: string;
  recommendedReasonDetail?: string;
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
  recommendedReason,
  recommendedReasonDetail
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
      navigate(`/events/${event.id}`, {
        state: { origin: { path: "/discover" }, isRecommended: true },
      });
    } else if (redirect) {
      navigate(`/events/${event.id}`, {
        state: { origin: { path: "/discover" } },
      });
    } else {
      onOpen(event);
    }
  };
  const price_not_found = event.price == null
  const free = event.price == 0
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
            {!compact?
            <div className="row tiny-gap" style={{position: "absolute", left: 10, top: 10}}>
              { event.eighteenPlus?
                <span className="pill2invert">
                  18+
                </span>: <></>
              }
              <span className="pill2" >
                {price_not_found? "Price unavailable": free? "Free": `$${event.price}`}
              </span>
            </div>: <></>}
            ✦
          </span>
        )}
        <div className="event-card-copy">
          {recommendedReason && (
            <span className="event-recommended-reason">
              {formatRecommendedReason(recommendedReason, recommendedReasonDetail ?? null)}
            </span>
          )}
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
          <span className="pill2" style={{fontSize: "11px", lineHeight: "11px"}}>
            {price_not_found? "Price unavailable": free? "Free": `$${event.price}`}
          </span>
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
        <div className="event-save-wrap">
          <button
            className="event-save"
            aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`}
            aria-pressed={saved}
            onClick={() => {if (session?.access_token) {onSave(event.id)} else {navigate("/login")}}}
          >
            {saved? <SaveIconFilled fill="#f6545c" stroke="#f6545c" className="icon"/>: <SaveIconFilled fill="white" stroke="#f6545c" className="icon"/>}
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
