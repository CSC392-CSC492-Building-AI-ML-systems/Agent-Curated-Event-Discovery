import type { EventideEvent } from '../interfaces/interfaces';

const colors = ['#b9dcf3', '#f9d3dc', '#f7e6a3', '#f7cdbb'];

export default function CalendarDayEvents({ events, dayKey, onOpen, onMore }: {
    events: EventideEvent[];
    dayKey: string;
    onOpen: (event: EventideEvent) => void;
    onMore: () => void;
}) {
    const sorted = [...events].sort((a, b) => Date.parse(a.startDate || '') - Date.parse(b.startDate || ''));
    return <div className="your-events-day-items">
        {sorted.slice(0, 3).map(event => {
            const time = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(event.startDate!));
            return <button className="your-events-calendar-event" style={{ backgroundColor: colors[(event.id - 1) % colors.length] }} key={event.id} onClick={() => onOpen(event)} aria-label={`View ${event.title}, ${time}, on ${dayKey}`}>
                <time dateTime={event.startDate}>{time}</time>
                <span className="your-events-event-title">{event.title}</span>
            </button>;
        })}
        {sorted.length > 3 && <button className="your-events-more" onClick={onMore} aria-label={`Show all ${sorted.length} events on ${dayKey}`}>{sorted.length - 3} more</button>}
    </div>;
}
