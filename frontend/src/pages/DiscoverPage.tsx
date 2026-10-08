import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TagLink from '../components/TagLink';
import NavBar from '../components/NavBar';
import SearchBar from '../components/SearchBar';
import DiscoverEventCard from '../components/DiscoverEventCard';
import EventDetails from '../components/EventDetails';
import type { EventideEvent } from '../interfaces/interfaces';
import './DiscoverPage.css';

export type EventPageProps = {
    events: EventideEvent[];
    saved: number[];
    onSave: (id: number) => void;
    followed: string[];
    onFollow: (tag: string) => void;
};

type BrowseState = { search: string; range: string; sort: string; categories: string[] };

export default function DiscoverPage({ events, saved, onSave, followed, browse, setBrowse }: EventPageProps & {
    browse: BrowseState; setBrowse: (state: BrowseState) => void;
}) {
    const { search, range, sort, categories } = browse;
    const setSearch = (search: string) => setBrowse({ ...browse, search });
    const location = useLocation();
    useEffect(() => {
        const frame = requestAnimationFrame(() => window.scrollTo(0, location.state?.returnScroll || 0));
        return () => cancelAnimationFrame(frame);
    }, [location.key, location.state]);
    const [selected, setSelected] = useState<EventideEvent | null>(null);
    const allCategories = [...new Set(events.flatMap(event => event.categories))].sort();
    const [now] = useState(() => Date.now());
    const query = search.trim().toLowerCase();
    const visible = events.filter(event => {
        const date = event.startDate ? new Date(event.startDate).getTime() : null;
        return (date === null || (date >= now && (range === 'all' || date <= now + Number(range) * 86400000)))
            && (!query || [event.title, event.description, event.address, ...event.categories].join(' ').toLowerCase().includes(query))
            && (!categories.length || event.categories.some(category => categories.includes(category)));
    }).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : (Date.parse(a.startDate || '') || 0) - (Date.parse(b.startDate || '') || 0));
    const renderCard = (event: EventideEvent, compact = false) => <DiscoverEventCard key={event.id} event={event} compact={compact} saved={saved.includes(event.id)} onSave={onSave} onOpen={setSelected} />;

    return <div className="discover-page">
        <div className="discover-wrap">
            <header className="discover-header"><Link className="discover-logo" to="/">even<i>tide</i><svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" /></svg></Link><NavBar savedCount={saved.length} /></header>
            <main>
                <SearchBar search={search} setSearch={setSearch} placeholder="Search events, topics, places" />
                <div className="discover-toolbar">
                    <label>Dates <select value={range} onChange={e => setBrowse({ ...browse, range: e.target.value })}><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="all">All upcoming</option></select></label>
                    <label>Sort by <select value={sort} onChange={e => setBrowse({ ...browse, sort: e.target.value })}><option value="upcoming">Upcoming</option><option value="title">Title A–Z</option></select></label>
                    <div className="discover-view"><span className="discover-pill active" aria-current="page">List</span><Link className="discover-pill" to="/map">Map</Link></div>
                </div>
                <div className="discover-topics" role="group" aria-label="Filter by topic"><span>Include</span>{allCategories.map(category => <button key={category} className={`discover-chip ${categories.includes(category) ? 'active' : ''}`} aria-pressed={categories.includes(category)} onClick={() => setBrowse({ ...browse, categories: categories.includes(category) ? categories.filter(value => value !== category) : [...categories, category] })}>#{category}</button>)}</div>
                {!query && visible.length > 0 && <section aria-labelledby="discover-for-you"><h2 id="discover-for-you">For You <span>✦ Curated events</span></h2><div className="discover-grid">{visible.slice(0, 6).map(event => renderCard(event, true))}</div></section>}
                <section aria-labelledby="discover-upcoming"><div className="discover-section-heading"><h2 id="discover-upcoming">{query ? `Results for “${search.trim()}”` : 'Upcoming'}</h2><span role="status">{visible.length} {visible.length === 1 ? 'event' : 'events'}</span></div>
                    {visible.length ? <div className="discover-list">{visible.map(event => renderCard(event))}</div> : <div className="discover-empty"><h3>No events match</h3><p>Try a wider date range, a different search, or fewer topics.</p><button className="discover-pill" onClick={() => { setBrowse({ search: '', categories: [], range: 'all', sort: 'upcoming' }); }}>Browse all events</button></div>}
                </section>
                {!query && <section aria-labelledby="discover-following"><h2 id="discover-following">Following <span className="discover-tags">{followed.map(category => <TagLink key={category} tag={category} />)}</span></h2>{followed.length ? followed.map(category => {
                    const matches = visible.filter(event => event.categories.includes(category));
                    return matches.length > 0 && <div key={category}><h3 className="discover-topic-heading"><TagLink tag={category} /></h3><div className="discover-grid">{matches.slice(0, 3).map(event => renderCard(event, true))}</div></div>;
                }) : <p className="discover-empty">Open a tag on an event and follow it to see its events here.</p>}</section>}
            </main>
            {selected && <EventDetails event={selected} saved={saved.includes(selected.id)} onSave={onSave} onClose={() => setSelected(null)} />}
        </div>
    </div>;
}
