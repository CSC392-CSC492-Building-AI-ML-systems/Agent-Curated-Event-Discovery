import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import TagLink from "../../components/TagLink";
import { Header } from "../../components/NavBar";
import type { EventideEvent } from "../../interfaces/interfaces";
import useEvent from "../../hooks/useEvent";
import "./EventPage.css";
import { rejectRecommendedEvent } from "../../api/recommendedEvents";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  saved: number[];
  onSave: (id: number) => void;
};

function formatDate(value: string | undefined, timeKnown = true): string {
  if (!value) return "Date to be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(timeKnown && {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  }).format(date);
}

function formatPrice(price: EventideEvent["price"]): string {
  if (price == null || price === "") return "Price not listed";

  const amount = Number(price);
  if (!Number.isFinite(amount)) return String(price);

  if (amount === 0) return "Free";

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export default function EventPage({ saved, onSave }: Props) {
  const { eventId } = useParams();
  const id = Number(eventId);

  const validId = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const isRecommended = location.state?.isRecommended === true;
  const navigate = useNavigate();
  const origin = location.state?.origin;
  const { session, loading: checkingSession } = useAuth();

  const token = session?.access_token;

  const { event, loading, error } = useEvent(id);

  function onReject(id: number) {
    if (!token) return;
    void rejectRecommendedEvent(id, token).catch(() => {});
  }

  function handleBack() {
    if (origin?.path) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="event-page">
      <div className="event-page-wrap">
        <Header savedCount={saved.length} />

        <main className="event-page-main">
          <Link to="/" className="event-page-back" onClick={handleBack}>
            ← Back
          </Link>

          {!validId ? (
            <p>Invalid event ID.</p>
          ) : loading ? (
            <p role="status">Loading event...</p>
          ) : error && !event ? (
            <div role="alert">
              <p>{error}</p>
            </div>
          ) : !event ? (
            <p>Event not found.</p>
          ) : (
            <>
              <div className="event-page-hero">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt="" />
                ) : (
                  <div className="event-page-placeholder" aria-hidden="true">
                    ✦
                  </div>
                )}
              </div>

              <div className="event-page-content">
                <div className="event-page-primary">
                  <div className="event-page-tags">
                    {event.tags.map((tag) => (
                      <TagLink key={tag.id} tag={tag} />
                    ))}
                  </div>

                  <h1>{event.title}</h1>

                  {event.eighteenPlus && (
                    <span className="event-page-age">18+ event</span>
                  )}

                  <section className="event-page-section">
                    <h2>About this event</h2>
                    <p className="event-page-description">
                      {event.description || "No description available."}
                    </p>
                  </section>

                  <section className="event-page-section">
                    <h2>Location</h2>
                    <h3>{event.venue.name}</h3>
                    {event.venue.address && <p>{event.venue.address}</p>}

                    {event.latitude != null && event.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/place/${encodeURIComponent(
                          `${event.venue.address}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get directions ↗
                      </a>
                    )}
                  </section>

                  {event.organizer && (
                    <section className="event-page-section">
                      <h2>Organizer</h2>
                      <h3>{event.organizer.name}</h3>

                      {event.organizer.website && (
                        <a
                          href={event.organizer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Organizer website ↗
                        </a>
                      )}
                    </section>
                  )}
                </div>

                <aside className="event-page-sidebar">
                  <div className="event-page-info-card">
                    <div className="event-page-info-item">
                      <span className="event-page-info-label">Date & time</span>
                      <strong>
                        {formatDate(event.startDate, event.startTimeKnown)}
                      </strong>

                      {event.endDate && (
                        <span>
                          Until {formatDate(event.endDate, event.endTimeKnown)}
                        </span>
                      )}
                    </div>

                    <div className="event-page-info-item">
                      <span className="event-page-info-label">Venue</span>
                      <strong>{event.venue.name}</strong>
                    </div>

                    <div className="event-page-info-item">
                      <span className="event-page-info-label">Price</span>
                      <strong>{formatPrice(event.price)}</strong>
                    </div>

                    <button
                      type="button"
                      className="event-page-save"
                      aria-pressed={saved.includes(event.id)}
                      onClick={() => onSave(event.id)}
                    >
                      {saved.includes(event.id) ? "★ Saved" : "☆ Save event"}
                    </button>
                    {isRecommended && (
                      <button
                        className="event-page-save"
                        aria-label={`Not interested in ${event.title}`}
                        onClick={() => onReject(event.id)}
                      >
                        ✕ Reject event
                      </button>
                    )}

                    {event.link && (
                      <a
                        className="event-page-website"
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Event website ↗
                      </a>
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
