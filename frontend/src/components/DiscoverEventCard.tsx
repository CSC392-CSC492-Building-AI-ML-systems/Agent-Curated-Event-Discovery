import type { EventideEvent } from '../interfaces/interfaces';

import { formatEventDate } from '../utils/eventDate';

type Props = {
    event: EventideEvent;
    compact?: boolean;
    saved: boolean;
    onOpen: (event: EventideEvent) => void;
    onSave: (id: number) => void;
};

export default function DiscoverEventCard({ event, compact = false, saved, onOpen, onSave }: Props) {
    return <article className={`discover-card ${compact ? 'discover-card-compact' : 'discover-card-large'}`}>
        <button className="discover-card-open" onClick={() => onOpen(event)} aria-label={`View ${event.title}`}>
            {event.imageUrl ? <img src={event.imageUrl} alt="" /> : <span className="discover-image-placeholder" aria-hidden="true">✦</span>}
            <div className="discover-card-copy">
                {compact && <span className="discover-date">{formatEventDate(event.startDate)}</span>}
                <h3>{event.title}</h3>
                {!compact && <p>{event.description}</p>}
                {compact && <span className="discover-location">{event.address || 'Location to be announced'}</span>}
            </div>
            {!compact && <div className="discover-card-footer">
                <span>{formatEventDate(event.startDate)}</span>
                <span>{event.address || 'Location to be announced'}</span>
                <span className="discover-tags">{event.categories.map(category => <span className="discover-chip" key={category}>#{category}</span>)}</span>
            </div>}
        </button>
        <button className="discover-save" aria-label={`${saved ? 'Unsave' : 'Save'} ${event.title}`} aria-pressed={saved} onClick={() => onSave(event.id)}>{saved ? '★' : '☆'}</button>
    </article>;
}
