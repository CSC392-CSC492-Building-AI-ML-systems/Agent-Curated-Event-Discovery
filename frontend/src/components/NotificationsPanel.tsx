import { useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
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
        id="notifications-panel"
        className={`notifications-panel ${open ? "open" : ""}`}
        aria-label="Notifications"
      >
        <h2>Notifications</h2>
        <p>
          No notifications yet.
          <br />
          Save some events to receive notifications.
        </p>
      </aside>
    </>
  );
}
