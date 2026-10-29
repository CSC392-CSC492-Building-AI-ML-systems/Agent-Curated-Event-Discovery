import { useState } from "react";
import { calendarDays, eventDayKey } from "../../utils/calendar";
import CalendarDayEvents from "../../components/CalendarDayEvents";
import type { EventideEvent } from "../../interfaces/interfaces";
import EventDetails from "../../components/EventDetails";
import CalendarDayDialog from "../../components/CalendarDayDialog";

type CalendarPageProps = {
    events: EventideEvent[]; //my saved events
    saved: number[];
    onSave: (id: number) => void;
    liked: number[];
    onLike: (id: number) => void;
}
function CalendarPage({events, saved, onSave, liked, onLike}: CalendarPageProps){
    const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selected, setSelected] = useState<EventideEvent | null>(null);
    const [today] = useState(() => eventDayKey(new Date().toISOString()));

    const mine = events
    .filter((event) => saved.includes(event.id))
    .sort((a, b) => {
      const dateA = Date.parse(a.startDate || "");
      const dateB = Date.parse(b.startDate || "");

      return (
        (Number.isNaN(dateA) ? Infinity : dateA) -
        (Number.isNaN(dateB) ? Infinity : dateB)
      );
    });
    const month =
        calendarMonth ||
        new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
      const setMonth = setCalendarMonth;
    
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const monthName = new Intl.DateTimeFormat("en-CA", {
        month: "long",
        year: "numeric",
      }).format(month);
      const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const monthEvents = mine.filter(
        (event) =>
          event.startDate && eventDayKey(event.startDate).startsWith(monthPrefix),
      );
      const changeMonth = (offset: number) =>
        setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
    return <>
        <section aria-labelledby="your-events-month">
            <div className="your-events-calendar-heading">
                <h2 id="your-events-month" aria-live="polite">
                {monthName}
                </h2>
                <div className="your-events-month-controls">
                <button
                    className="pill"
                    aria-label="Previous month"
                    onClick={() => changeMonth(-1)}
                >
                    ←
                </button>
                <button
                    className="pill"
                    onClick={() =>
                    setMonth(
                        new Date(
                        Number(today.slice(0, 4)),
                        Number(today.slice(5, 7)) - 1,
                        1,
                        ),
                    )
                    }
                >
                    This month
                </button>
                <button
                    className="pill"
                    aria-label="Next month"
                    onClick={() => changeMonth(1)}
                >
                    →
                </button>
                </div>
            </div>
            <div
                className="your-events-calendar-scroll"
                tabIndex={0}
                role="region"
                aria-label="Monthly calendar"
            >
                <div
                className="your-events-calendar"
                aria-label={`Saved events for ${monthName}`}
                >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                    <div className="your-events-weekday" key={day}>
                        {day}
                    </div>
                    ),
                )}
                {calendarDays(year, monthIndex).map((day, index) => {
                    const dayKey = day
                    ? `${monthPrefix}-${String(day).padStart(2, "0")}`
                    : "";
                    const dayEvents = monthEvents.filter(
                    (event) =>
                        event.startDate &&
                        eventDayKey(event.startDate) === dayKey,
                    );
                    return (
                    <div
                        key={index}
                        className={`your-events-day ${day ? "" : "your-events-day-blank"} ${dayKey === today ? "your-events-today" : ""}`}
                    >
                        {day && (
                        <>
                            <time
                            dateTime={dayKey}
                            aria-label={`${monthName} ${day}`}
                            className="your-events-day-number"
                            >
                            {day}
                            </time>
                            <CalendarDayEvents
                            events={dayEvents}
                            dayKey={dayKey}
                            onOpen={setSelected}
                            onMore={() => setSelectedDay(dayKey)}
                            />
                        </>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
            {!monthEvents.length && (
                <p className="your-events-calendar-note" role="status">
                No saved events this month.
                </p>
            )}
        </section>
        {selectedDay && (
          <CalendarDayDialog
            dayKey={selectedDay}
            events={mine.filter(
              (event) =>
                event.startDate && eventDayKey(event.startDate) === selectedDay,
            )}
            onSave={onSave}
            onClose={() => setSelectedDay(null)}
            onOpen={(event) => {
              setSelectedDay(null);
              setSelected(event);
            }}
          />
        )}
        {selected && (
          <EventDetails
            event={selected}
            saved={saved.includes(selected.id)}
            onSave={onSave}
            liked={liked.includes(selected.id)}
            onLike={onLike}
            onClose={() => setSelected(null)}
          />
        )}
    </>
}
export default CalendarPage;