import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSavedEvents } from "../contexts/SavedEventsContext";
import savedNotifications from "../utils/savedNotifications";
import { formatEventDate } from "../utils/eventDate";
import EventDetails from "./EventDetails";
import type { EventideEvent } from "../interfaces/interfaces";

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EventideEvent | null>(null);
  const { session } = useAuth();
  const { events, saved, onSave } = useSavedEvents();
  const notifications = savedNotifications(events, saved);
  const panelRef = useRef<HTMLElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // The label is part of the identity, so an event rolling from 1 Week Away to
  // Tomorrow counts as a new notification.
  const tokens = notifications.map(
    ({ event, label }) => `${event.id}:${label}`,
  );
  // Logged out: no key, so this lasts only for the page view.
  const seenKey = session
    ? `eventide:notifications-seen:${session.user.id}`
    : null;
  const [seen, setSeen] = useState<string[]>(() => {
    try {
      const stored = seenKey
        ? JSON.parse(localStorage.getItem(seenKey) ?? "[]")
        : [];
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const unseen = tokens.filter((token) => !seen.includes(token));

  function toggle() {
    // Opening is what marks these as seen; closing must not. Storing exactly
    // the current tokens also drops ones that no longer apply — but only once
    // there are some, since events load after the first render and an empty
    // list would otherwise erase what has already been seen.
    if (!open && tokens.length) {
      setSeen(tokens);
      try {
        if (seenKey) localStorage.setItem(seenKey, JSON.stringify(tokens));
      } catch {
        /* Private browsing refuses to store; the badge just returns. */
      }
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !bellRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  return (
    <>
      <button
        ref={bellRef}
        className={`notifications-bell ${open ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-label={
          unseen.length ? `Notifications, ${unseen.length} new` : "Notifications"
        }
        onClick={toggle}
      >
        <Bell size={20} />
        {unseen.length > 0 && (
          <span className="notifications-count" aria-hidden="true">
            {unseen.length}
          </span>
        )}
      </button>

      {/* Stays mounted since unmounting would skip the slide-out animation. */}
      <aside
        ref={panelRef}
        id="notifications-panel"
        className={`notifications-panel ${open ? "open" : ""}`}
        aria-label="Notifications"
      >
        <h2>Notifications</h2>
        {notifications.length === 0 ? (
          <p>
            No notifications yet.
            <br />
            Save some events to receive notifications.
          </p>
        ) : (
          <ul className="notifications-list">
            {notifications.map(({ event, label }) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(event);
                    setOpen(false);
                  }}
                >
                  <span className="notifications-label">{label}</span>
                  <strong>{event.title}</strong>
                  <span>
                    {formatEventDate(
                      event.startDate,
                      event.startTimeKnown !== false,
                    )}
                  </span>
                  <span>{event.venue.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {selected && (
        <EventDetails
          event={selected}
          saved={saved.includes(selected.id)}
          onSave={onSave}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
