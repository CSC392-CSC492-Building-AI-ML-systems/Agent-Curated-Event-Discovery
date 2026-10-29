import TagLink from "./TagLink";
import React, { useEffect, useRef } from "react";
import type { EventideEvent } from "../interfaces/interfaces";

export default function EventDetails({
  event,
  saved,
  onSave,
  onReject,
  onClose,
  popup = true,
  style,
}: {
  event: EventideEvent;
  saved: boolean;
  onSave: (id: number) => void;
  // Only recommended events pass this, so the reject button stays off other events.
  onReject?: (id: number) => void;
  onClose: () => void;
  popup?: boolean;
  style?: React.CSSProperties;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const content = (
    <>
      {event.imageUrl && <img src={event.imageUrl} alt="" loading="lazy" />}

      <h2 id="discover-detail-title">{event.title}</h2>

      <p className="event-date">
        {event.startDate} · {event.venue.name}
      </p>

      <p>{event.description}</p>

      <div className="discover-tags">
        {event.tags.map((tag) => (
          <TagLink key={tag.id} tag={tag} onNavigate={onClose} />
        ))}
      </div>

      <div className="row small-gap">
        <button
          type="button"
          className="pill"
          aria-pressed={saved}
          onClick={() => onSave(event.id)}
        >
          {saved ? "★ Saved" : "☆ Save event"}
        </button>

        {onReject && (
          <button
            type="button"
            className="pill"
            onClick={() => onReject(event.id)}
          >
            ✕ Reject
          </button>
        )}
      </div>
    </>
  );

  useEffect(() => {
    if (!popup) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => {
      if (element.open) element.close();
    };
  }, []);

  if (!popup) {
    return (
      <div className="discover-dialog" style={style}>
        {content}
      </div>
    );
  }

  return (
    <dialog
      ref={dialog}
      className="discover-dialog"
      aria-labelledby="discover-detail-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={style}
    >
      <button
        type="button"
        className="discover-dialog-close"
        aria-label="Close event details"
        onClick={onClose}
      >
        ×
      </button>

      {content}
    </dialog>
  );
}
