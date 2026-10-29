import { Link } from "react-router-dom";
import DiscoverEventCard from "../../components/DiscoverEventCard";
import type { EventideEvent } from "../../interfaces/interfaces";
import { useState } from "react";
import EventDetails from "../../components/EventDetails";
type LikesPageProps = {
    events: EventideEvent[]; //my saved events
    saved: number[];
    onSave: (id: number) => void;
    liked: number[];
    onLike: (id: number) => void;
}
function LikesPage({events, saved, onSave, liked, onLike}: LikesPageProps){
    const [selected, setSelected] = useState<EventideEvent | null>(null);
    const mine = events
    .filter((event) => liked.includes(event.id))
    .sort((a, b) => {
      const dateA = Date.parse(a.startDate || "");
      const dateB = Date.parse(b.startDate || "");

      return (
        (Number.isNaN(dateA) ? Infinity : dateA) -
        (Number.isNaN(dateB) ? Infinity : dateB)
      );
    });
    return <>   
            {(!mine.length ? (
                      <section className="discover-empty your-events-empty">
                        <h2>Your Likes</h2>
                        <p>
                          Nothing saved yet. Tap ⁠♡ on any event in Discover to keep it
                          here.
                        </p>
                        <Link className="pill" to="/">
                          Discover events
                        </Link>
                      </section>
                    ):<section aria-labelledby="your-events-list-title">
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
                      saved={saved.includes(event.id)}
                      onSave={onSave}
                      liked
                      onLike={onLike}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
              </section>)
            }   
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

export default LikesPage;