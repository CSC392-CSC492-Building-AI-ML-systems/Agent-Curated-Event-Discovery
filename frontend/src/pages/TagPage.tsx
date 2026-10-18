import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/NavBar";
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import EventRequestState from "../components/EventRequestState";
import type { EventideEvent, EventPageProps } from "../interfaces/interfaces";
import "./DiscoverPage.css";

export default function TagPage({
  events,
  saved,
  onSave,
  followed,
  onFollow,
  loading,
  error,
  retry,
}: EventPageProps) {
  const { tag = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<EventideEvent | null>(null);
  const origin = location.state?.origin;
  const returnPath = origin?.path === "/your-events" ? "/your-events" : "/";
  const returnLabel =
    returnPath === "/your-events" ? "Your Events" : "Discover";
  const matches = events
    .filter((event) => event.tags.some(topic => topic.name === tag))
    .sort(
      (a, b) =>
        (Date.parse(a.startDate || "") || 0) -
        (Date.parse(b.startDate || "") || 0),
    );
  const known = events.flatMap(event => event.tags).find(topic => topic.name === tag);
  const isFollowing = followed.some(topic => topic.id === known?.id);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tag]);
  return (
    <div className="discover-page">
      <div className="discover-wrap">
        <Header savedCount={saved.length} />
        <main>
          <div className="tag-page-heading">
            <button
              className="pill tag-page-back"
              aria-label={`Back to ${returnLabel}`}
              onClick={() =>
                navigate(returnPath, {
                  state: { returnScroll: origin?.scroll || 0 },
                })
              }
            >
              ← <span>{returnLabel}</span>
            </button>
            <h1>#{tag}</h1>
            {known && (
              <button
                className={`pill ${isFollowing ? "active" : ""}`}
                aria-pressed={isFollowing}
                aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${tag}`}
                onClick={() => onFollow(known)}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <span className="tag-page-count" role="status">
              {matches.length} {matches.length === 1 ? "event" : "events"}
            </span>
          </div>
          <EventRequestState loading={loading} error={error} retry={retry} />
          {!loading &&
            !error &&
            (matches.length ? (
              <div className="discover-list">
                {matches.map((event) => (
                  <DiscoverEventCard
                    key={event.id}
                    event={event}
                    saved={saved.includes(event.id)}
                    onSave={onSave}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            ) : (
              <div className="discover-empty">
                <h2>Tag not found</h2>
                <p>No events are available for this tag.</p>
                <Link className="pill" to="/">
                  Browse Discover
                </Link>
              </div>
            ))}
        </main>
        {selected && (
          <EventDetails
            event={selected}
            saved={saved.includes(selected.id)}
            onSave={onSave}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
