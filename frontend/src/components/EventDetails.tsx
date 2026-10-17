import TagLink from "./TagLink";
import React, { useEffect, useRef } from "react";
import type { EventideEvent } from "../interfaces/interfaces";
import { formatEventDate } from "../utils/eventDate";

export default function EventDetails({
  event,
  saved,
  onSave,
  onClose,
  popup = true,
  style,
}: {
  event: EventideEvent;
  saved: boolean;
  onSave: (id: number) => void;
  onClose: () => void;
  popup?: boolean;
  style?: React.CSSProperties;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return popup ? (
    <dialog
      className="discover-dialog"
      ref={dialog}
      aria-labelledby="discover-detail-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={style ?? {}}
    >
      <button
        className="discover-dialog-close"
        aria-label="Close event details"
        onClick={onClose}
      >
        ×
      </button>
      {event.imageUrl && <img src={event.imageUrl} alt="" />}
      <h2 id="discover-detail-title">{event.title}</h2>
      <p className="event-date">
        {formatEventDate(event.startDate, event.startTimeKnown)} ·{" "}
        {event.venue.name || "Location to be announced"}
      </p>
      <p>{event.description}</p>
      <div className="discover-tags">
        {event.tags.map((tag) => (
          <TagLink key={tag.id} tag={tag.name} onNavigate={onClose} />
        ))}{" "}
      </div>
      <button
        className="pill"
        aria-pressed={saved}
        onClick={() => onSave(event.id)}
      >
        {saved ? "★ Saved" : "☆ Save event"}
      </button>
    </dialog>
  ) : (
    <div
      style={style ?? {}}
      className="discover-dialog"
      aria-labelledby="discover-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {event.imageUrl && <img src={event.imageUrl} alt="" />}
      <h2 id="discover-detail-title">{event.title}</h2>
      <p className="event-date">
        {formatEventDate(event.startDate, event.startTimeKnown)} ·{" "}
        {event.venue.name || "Location to be announced"}
      </p>
      <p>{event.description}</p>
      <div className="discover-tags">
        {event.tags.map((tag) => (
          <TagLink key={tag.id} tag={tag.name} onNavigate={onClose} />
        ))}
      </div>
      <button
        className="pill"
        aria-pressed={saved}
        onClick={() => onSave(event.id)}
      >
        {saved ? "★ Saved" : "☆ Save event"}
      </button>
    </div>
  );
}
