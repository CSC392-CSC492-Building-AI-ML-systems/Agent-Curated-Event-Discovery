import { useEffect } from "react";
import type { ConflictNotification } from "../hooks/useConflictNotifications";
import "./ConflictNotifications.css";

const LIFETIME_MS = 6000;
const BUBBLE_STYLE = { animationDuration: `${LIFETIME_MS}ms` };

type ConflictBubbleProps = {
  notification: ConflictNotification;
  onDismiss: (id: number) => void;
};

function ConflictBubble({ notification, onDismiss }: ConflictBubbleProps) {
  const { id, eventTitle, conflictingTitle, additionalCount } = notification;
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="conflict-bubble" style={BUBBLE_STYLE}>
      <strong>Time conflict</strong>
      <p className="conflict-summary">
        <span className="conflict-event-title" title={eventTitle}>
          {eventTitle}
        </span>
        <span>conflicts with</span>
      </p>
      <p className="conflict-existing">
        <span className="conflict-event-title" title={conflictingTitle}>
          {conflictingTitle}
        </span>
        {additionalCount > 0 && <span>+{additionalCount} more</span>}
      </p>
    </div>
  );
}

type Props = {
  notifications: readonly ConflictNotification[];
  onDismiss: (id: number) => void;
};

export default function ConflictNotifications({ notifications, onDismiss }: Props) {
  return (
    <aside
      className="conflict-notifications"
      aria-label="Calendar conflict notifications"
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="false"
    >
      {notifications.map(notification => (
        <ConflictBubble
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </aside>
  );
}
