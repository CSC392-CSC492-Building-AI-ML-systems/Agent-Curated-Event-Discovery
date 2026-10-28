import TagLink from "./TagLink";
import React, { useEffect, useRef } from "react";
import type { EventideEvent } from "../interfaces/interfaces";
import closeIcon from "../assets/images/close-icon.svg";

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

      <button
        type="button"
        className="pill"
        aria-pressed={saved}
        onClick={() => onSave(event.id)}
      >
        {saved ? "★ Saved" : "☆ Save event"}
      </button>
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
        <img className="close-icon" src={closeIcon} alt="" />
      </button>

      {content}
    </dialog>
  );
}
