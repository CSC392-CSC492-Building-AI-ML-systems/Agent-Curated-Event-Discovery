import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DiscoverEventCard from '../components/DiscoverEventCard';
import EventDetails from '../components/EventDetails';
import EventRequestState from '../components/EventRequestState';
import type { EventPageProps } from './DiscoverPage';
import type { EventideEvent } from '../interfaces/interfaces';
import './DiscoverPage.css';

export default function TagPage({ events, saved, onSave, followed, onFollow, loading, error, retry }: EventPageProps) {
    const { tag = '' } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [selected, setSelected] = useState<EventideEvent | null>(null);
    const origin = location.state?.origin;
    const returnPath = origin?.path === '/your-events' ? '/your-events' : '/';
    const returnLabel = returnPath === '/your-events' ? 'Your Events' : 'Discover';
    const matches = events.filter(event => event.categories.includes(tag)).sort((a, b) => (Date.parse(a.startDate || '') || 0) - (Date.parse(b.startDate || '') || 0));
    const known = events.some(event => event.categories.includes(tag));
    const isFollowing = followed.includes(tag);
    useEffect(() => { window.scrollTo(0, 0); }, [tag]);
    return <div className="discover-page"><div className="discover-wrap">
        <header className="discover-header"><Link className="discover-logo" to="/">even<i>tide</i><svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" /></svg></Link><NavBar savedCount={saved.length} /></header>
        <main>
            <div className="tag-page-heading">
                <button className="discover-pill tag-page-back" aria-label={`Back to ${returnLabel}`} onClick={() => navigate(returnPath, { state: { returnScroll: origin?.scroll || 0 } })}>← <span>{returnLabel}</span></button>
                <h1>#{tag}</h1>
                {known && <button className={`discover-pill ${isFollowing ? 'active' : ''}`} aria-pressed={isFollowing} aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} ${tag}`} onClick={() => onFollow(tag)}>{isFollowing ? 'Following' : 'Follow'}</button>}
                <span className="tag-page-count" role="status">{matches.length} {matches.length === 1 ? 'event' : 'events'}</span>
            </div>
            <EventRequestState loading={loading} error={error} retry={retry} />
            {!loading && !error && (matches.length ? <div className="discover-list">{matches.map(event => <DiscoverEventCard key={event.id} event={event} saved={saved.includes(event.id)} onSave={onSave} onOpen={setSelected} />)}</div> : <div className="discover-empty"><h2>Tag not found</h2><p>No events are available for this tag.</p><Link className="discover-pill" to="/">Browse Discover</Link></div>)}
        </main>
        {selected && <EventDetails event={selected} saved={saved.includes(selected.id)} onSave={onSave} onClose={() => setSelected(null)} />}
    </div></div>;
}
