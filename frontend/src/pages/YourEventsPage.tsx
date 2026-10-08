import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DiscoverEventCard from '../components/DiscoverEventCard';
import EventDetails from '../components/EventDetails';
import CalendarDayEvents from '../components/CalendarDayEvents';
import CalendarDayDialog from '../components/CalendarDayDialog';
import type { EventPageProps } from './DiscoverPage';
import type { EventideEvent } from '../interfaces/interfaces';
import { calendarDays, eventDayKey } from '../utils/calendar';
import './DiscoverPage.css';
import './YourEventsPage.css';

export default function YourEventsPage({ events, saved, onSave, view, setView, calendarMonth, setCalendarMonth }: EventPageProps & {
    view: 'list' | 'calendar'; setView: (view: 'list' | 'calendar') => void;
    calendarMonth: Date | null; setCalendarMonth: (month: Date) => void;
}) {
    const location = useLocation();
    useEffect(() => {
        const frame = requestAnimationFrame(() => window.scrollTo(0, location.state?.returnScroll || 0));
        return () => cancelAnimationFrame(frame);
    }, [location.key, location.state]);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selected, setSelected] = useState<EventideEvent | null>(null);
    const [today] = useState(() => eventDayKey(new Date().toISOString()));
    const month = calendarMonth || new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
    const setMonth = setCalendarMonth;
    const mine = events.filter(event => saved.includes(event.id)).sort((a, b) => (Date.parse(a.startDate || '') || 0) - (Date.parse(b.startDate || '') || 0));
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const monthName = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric' }).format(month);
    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const monthEvents = mine.filter(event => event.startDate && eventDayKey(event.startDate).startsWith(monthPrefix));
    const changeMonth = (offset: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
    return <div className="discover-page">
        <div className="discover-wrap">
            <header className="discover-header"><Link className="discover-logo" to="/">even<i>tide</i><svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" /></svg></Link><NavBar savedCount={saved.length} /></header>
            <main>
                <div className="your-events-switch" role="group" aria-label="Saved events view">
                    <button className={`discover-pill ${view === 'list' ? 'active' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List View</button>
                    <button className={`discover-pill ${view === 'calendar' ? 'active' : ''}`} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar View</button>
                </div>
                {!mine.length ? <section className="discover-empty your-events-empty"><h2>Your Events</h2><p>Nothing saved yet. Tap ☆ on any event in Discover to keep it here.</p><Link className="discover-pill" to="/">Discover events</Link></section> : view === 'list' ? <section aria-labelledby="your-events-list-title">
                    <div className="discover-section-heading"><h2 id="your-events-list-title">Upcoming</h2><span role="status">{mine.length} saved {mine.length === 1 ? 'event' : 'events'}</span></div>
                    <div className="discover-list">{mine.map(event => <DiscoverEventCard key={event.id} event={event} saved onSave={onSave} onOpen={setSelected} />)}</div>
                </section> : <section aria-labelledby="your-events-month">
                    <div className="your-events-calendar-heading"><h2 id="your-events-month" aria-live="polite">{monthName}</h2><div className="your-events-month-controls">
                        <button className="discover-pill" aria-label="Previous month" onClick={() => changeMonth(-1)}>←</button>
                        <button className="discover-pill" onClick={() => setMonth(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1))}>This month</button>
                        <button className="discover-pill" aria-label="Next month" onClick={() => changeMonth(1)}>→</button>
                    </div></div>
                    <div className="your-events-calendar-scroll" tabIndex={0} role="region" aria-label="Monthly calendar"><div className="your-events-calendar" aria-label={`Saved events for ${monthName}`}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="your-events-weekday" key={day}>{day}</div>)}
                        {calendarDays(year, monthIndex).map((day, index) => {
                            const dayKey = day ? `${monthPrefix}-${String(day).padStart(2, '0')}` : '';
                            const dayEvents = monthEvents.filter(event => event.startDate && eventDayKey(event.startDate) === dayKey);
                            return <div key={index} className={`your-events-day ${day ? '' : 'your-events-day-blank'} ${dayKey === today ? 'your-events-today' : ''}`}>
                                {day && <><time dateTime={dayKey} aria-label={`${monthName} ${day}`} className="your-events-day-number">{day}</time><CalendarDayEvents events={dayEvents} dayKey={dayKey} onOpen={setSelected} onMore={() => setSelectedDay(dayKey)} /></>}
                            </div>;
                        })}
                    </div>
                    </div>
                    {!monthEvents.length && <p className="your-events-calendar-note" role="status">No saved events this month. Try another month or save more events in Discover.</p>}
                </section>}
            </main>
            {selectedDay && <CalendarDayDialog dayKey={selectedDay} events={mine.filter(event => event.startDate && eventDayKey(event.startDate) === selectedDay)} onSave={onSave} onClose={() => setSelectedDay(null)} onOpen={event => { setSelectedDay(null); setSelected(event); }} />}
            {selected && <EventDetails event={selected} saved={saved.includes(selected.id)} onSave={onSave} onClose={() => setSelected(null)} />}
        </div>
    </div>;
}
