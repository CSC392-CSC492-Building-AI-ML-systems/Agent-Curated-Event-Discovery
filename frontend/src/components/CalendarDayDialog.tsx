import { useEffect, useRef } from 'react';
import DiscoverEventCard from './DiscoverEventCard';
import type { EventideEvent } from '../interfaces/interfaces';

export default function CalendarDayDialog({ dayKey, events, saved, onOpen, onSave, onClose }: {
    dayKey: string; events: EventideEvent[];
    saved: number[]; 
    onOpen: (event: EventideEvent) => void; onSave: (id: number) => void; onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    const title = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' }).format(new Date(`${dayKey}T12:00:00-04:00`));
    return <dialog ref={dialog} className="discover-dialog your-events-day-dialog" aria-labelledby="calendar-day-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        <button className="discover-dialog-close" aria-label="Close day events" onClick={onClose}>×</button>
        <h2 id="calendar-day-title">{title}</h2>
        <p>{events.length} calendar {events.length === 1 ? 'event' : 'events'}</p>
        <div className="discover-list">{events.map(event => <DiscoverEventCard redirect={false} key={event.id} event={event} compact saved={saved.includes(event.id)} onSave={onSave} onOpen={onOpen} />)}</div>
    </dialog>;
}
