import { useNavigate } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import type { EventideEvent } from "../interfaces/interfaces";
import { useAuth } from "../contexts/AuthContext";
import { useCalendar } from "../contexts/calendarContext";
import "./CalendarEventButton.css";

type Props = { event: EventideEvent; variant?: "icon" | "label" };

export default function CalendarEventButton({ event, variant = "icon" }: Props) {
  const { session } = useAuth();
  const calendar = useCalendar();
  const navigate = useNavigate();
  const added = calendar.events.some(item => item.id === event.id);
  const busy = calendar.pending.has(event.id);
  const label = added ? "Remove from calendar" : "Add to calendar";
  const unavailable = !!session && (calendar.loading || !!calendar.error);
  const CalendarIcon = added ? Minus : Plus;
  const iconColour = variant === "label" ? "currentColor" : "#f6545c";

  function handleClick() {
    if (!session) {
      void navigate("/login", { state: { returnTo: "/calendar" } });
      return;
    }
    void calendar.toggle(event);
  }

  return (
    <button
      type="button"
      className={`calendar-event-button ${variant === "label" ? "pill" : ""}`}
      aria-label={`${label}: ${event.title}`}
      aria-pressed={added}
      aria-busy={busy}
      title={unavailable ? "Calendar unavailable. Open Your Calendar to retry." : label}
      disabled={busy || unavailable}
      onClick={handleClick}
    >
      <CalendarIcon
        className="calendar-event-symbol icon"
        color={iconColour}
        strokeWidth={2}
        aria-hidden="true"
      />
      {variant === "label" && <span>{busy ? "Updating…" : added ? "On calendar" : "Add to calendar"}</span>}
    </button>
  );
}
