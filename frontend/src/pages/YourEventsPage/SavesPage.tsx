import { Link } from "react-router-dom";
import DiscoverEventCard from "../../components/DiscoverEventCard";
import type { EventideEvent } from "../../interfaces/interfaces";
import { useState } from "react";
import EventDetails from "../../components/EventDetails";
import SaveIcon from '../../assets/images/save-icon.svg?react';

type SavesPageProps = {
    events: EventideEvent[]; //my saved events\
    saved: number[];
    onSave: (id: number) => void;
    liked: number[];
    onLike: (id: number) => void;
}
function SavesPage({events, saved, onSave, liked, onLike}: SavesPageProps){
    const [selected, setSelected] = useState<EventideEvent | null>(null);
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
    return <>{(!mine.length ? 
            (
            <section className="discover-empty your-events-empty">
                <h2>Your Events</h2>
                <p style={{display: "inline"}}>Nothing saved yet. Tap </p><SaveIcon style={{display: "inline", verticalAlign: "middle"}} width="15px" height="15px"/><p style={{display: "inline"}}> on any event in Discover to keep it here.</p>
                <Link style={{display: "flex", width: "fit-content", justifySelf:"center"}} className="pill" to="/"> Discover events </Link>
            </section>
            ):
            <section aria-labelledby="your-events-list-title">
                <div className="discover-section-heading">
                  <h2 id="your-events-list-title">Upcoming</h2>
                  <span role="status">
                    {mine.length} saved {mine.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <div className="discover-list">
                  {mine.map((event: EventideEvent) => (
                    <DiscoverEventCard
                      key={event.id}
                      event={event}
                      saved
                      onSave={onSave}
                      liked={liked.includes(event.id)}
                      onLike={onLike}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
            </section>
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

export default SavesPage;