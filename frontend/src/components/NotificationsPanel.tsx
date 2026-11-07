import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useSavedEvents } from "../contexts/SavedEventsContext";
import savedNotifications from "../utils/savedNotifications";
import { formatEventDate } from "../utils/eventDate";

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const { events, saved } = useSavedEvents();
  const notifications = savedNotifications(events, saved);
  const panelRef = useRef<HTMLElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

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
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
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
                <span className="notifications-label">{label}</span>
                <strong>{event.title}</strong>
                <span>
                  {formatEventDate(
                    event.startDate,
                    event.startTimeKnown !== false,
                  )}
                </span>
                <span>{event.venue.name}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
