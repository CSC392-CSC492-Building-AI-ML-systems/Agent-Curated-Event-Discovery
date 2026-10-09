import TagLink from './TagLink';
import { useEffect, useRef } from 'react';
import type { EventideEvent } from '../interfaces/interfaces';
import { formatEventDate } from '../utils/eventDate';

export default function EventDetails({ event, saved, onSave, onClose }: {
    event: EventideEvent; saved: boolean; onSave: (id: number) => void; onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return <dialog className="discover-dialog" ref={dialog} aria-labelledby="discover-detail-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <button className="discover-dialog-close" aria-label="Close event details" onClick={onClose}>×</button>
        {event.imageUrl && <img src={event.imageUrl} alt="" />}
        <h2 id="discover-detail-title">{event.title}</h2>
        <p className="discover-date">{formatEventDate(event.startDate)} · {event.address || 'Location to be announced'}</p>
        <p>{event.description}</p>
        <div className="discover-tags">{event.categories.map(category => <TagLink key={category} tag={category} onNavigate={onClose} />)}</div>
        <button className="discover-pill" aria-pressed={saved} onClick={() => onSave(event.id)}>{saved ? '★ Saved' : '☆ Save event'}</button>
    </dialog>;
}

