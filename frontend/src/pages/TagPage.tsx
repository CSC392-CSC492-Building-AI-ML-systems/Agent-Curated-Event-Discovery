import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/NavBar";
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import EventRequestState from "../components/EventRequestState";
import type { EventideEvent, EventPageProps } from "../interfaces/interfaces";
import "./DiscoverPage.css";
import useTagPageData from "../hooks/useTagPageData";

export default function TagPage({
  events,
  saved,
  onSave,
  liked, 
  onLike,
  followed,
  onFollow,
}: EventPageProps) {
  const { tagId: tagIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<EventideEvent | null>(null);
  const origin = location.state?.origin;
  const returnPath = origin?.path === "/your-events" ? "/your-events" : "/";
  const returnLabel =
    returnPath === "/your-events" ? "Your Events" : "Discover";
  const tagId =
    tagIdParam !== undefined &&
    /^\d+$/.test(tagIdParam) &&
    Number.isSafeInteger(Number(tagIdParam))
      ? Number(tagIdParam)
      : null;

  const {
    tag: currentTag,
    events: tagEvents,
    loading,
    error,
    retry,
  } = useTagPageData(tagId);

  const matches = [...tagEvents].sort(
    (a, b) =>
      (Date.parse(a.startDate || "") || 0) -
      (Date.parse(b.startDate || "") || 0),
  );

  const isFollowing =
    currentTag !== null && followed.some((tag) => tag.id === currentTag.id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTag]);

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
            <h1>#{currentTag?.name}</h1>
            {currentTag && (
              <button
                className={`pill ${isFollowing ? "active" : ""}`}
                aria-pressed={isFollowing}
                aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${currentTag?.name}`}
                onClick={() => onFollow(currentTag!)}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <span className="tag-page-count" role="status">
              {matches.length} {matches.length === 1 ? "event" : "events"}
            </span>
          </div>
          {tagId === null ? (
            <div className="discover-empty">
              <h2>Invalid tag</h2>
              <p>The tag URL is not valid.</p>
              <Link className="pill" to="/">
                Browse Discover
              </Link>
            </div>
          ) : (
            <>
              <EventRequestState
                loading={loading}
                error={error}
                retry={retry}
              />

              {!loading &&
                !error &&
                (matches.length > 0 ? (
                  <div className="discover-list">
                    {matches.map((event) => (
                      <DiscoverEventCard
                        key={event.id}
                        event={event}
                        saved={saved.includes(event.id)}
                        onSave={onSave}
                        liked={liked.includes(event.id)}
                        onLike={onLike}
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
            </>
          )}
        </main>
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
      </div>
    </div>
  );
}
