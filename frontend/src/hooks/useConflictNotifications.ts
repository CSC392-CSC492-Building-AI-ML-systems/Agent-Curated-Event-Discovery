import { useCallback, useRef, useState } from "react";

export type ConflictNotification = {
  id: number;
  eventTitle: string;
  conflictingTitle: string;
  additionalCount: number;
};

const MAX_VISIBLE_NOTIFICATIONS = 3;

export default function useConflictNotifications() {
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => {
    setNotifications(current =>
      current.filter(notification => notification.id !== id),
    );
  }, []);
  const notify = useCallback((eventTitle: string, conflictingTitles: string[]) => {
    if (conflictingTitles.length === 0) return;
    const notification = {
      id: nextId.current++,
      eventTitle,
      conflictingTitle: conflictingTitles[0],
      additionalCount: conflictingTitles.length - 1,
    };
    setNotifications(current =>
      [notification, ...current].slice(0, MAX_VISIBLE_NOTIFICATIONS),
    );
  }, []);
  return { notifications, notify, dismiss };
}
