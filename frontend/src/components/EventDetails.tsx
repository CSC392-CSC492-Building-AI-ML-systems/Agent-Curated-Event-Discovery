import TagLink from "./TagLink";
import React, { useEffect, useRef } from "react";
import type { EventideEvent } from "../interfaces/interfaces";
import closeIcon from "../assets/images/close-icon.svg";
import SaveIcon from '../assets/images/save-icon.svg?react';
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import HeartIcon from '../assets/images/heart-icon.svg?react';
import HeartIconFilled from '../assets/images/heart-icon-filled.svg?react';

export default function EventDetails({
  event,
  saved,
  onSave,
  liked,
  onLike,
  onClose,
  popup = true,
  style,
}: {
  event: EventideEvent;
  saved: boolean;
  onSave: (id: number) => void;
  liked: boolean;
  onLike: (id: number) => void;
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
          aria-pressed={liked}
          onClick={() => onLike(event.id)}
          style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "10px"}}
        >
          {liked? <HeartIconFilled height="20px" width="20px"/>: <HeartIcon height="20px" width="20px"/> }<p style={{margin: 0}}>{liked ? "Liked" : "Like event"}</p>
        </button>
        <button
          type="button"
          className="pill"
          aria-pressed={saved}
          onClick={() => onSave(event.id)}
          style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "10px"}}
        >
          {saved? <SaveIconFilled height="20px" width="20px"/>: <SaveIcon height="20px" width="20px"/> }<p style={{margin: 0}}>{saved ? "Saved" : "Save event"}</p>
        </button>
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
        <img className="close-icon" src={closeIcon} alt="" />
      </button>

      {content}
    </dialog>
  );
}
