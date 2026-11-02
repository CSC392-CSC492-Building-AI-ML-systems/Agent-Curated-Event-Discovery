import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePreferences } from "../contexts/PreferencesContext";
import {
  getRecommendedEvents,
  rejectRecommendedEvent,
} from "../api/recommendedEvents";
import { toEventideEvent } from "../api/adapters";
import DiscoverEventCard from "./DiscoverEventCard";
import EventDetails from "./EventDetails";
import type { EventideEvent } from "../interfaces/interfaces";

type Props = {
  saved: number[];
  onSave: (id: number) => void;
};

export default function ForYouSection({ saved, onSave }: Props) {
  const { session, loading: checkingSession } = useAuth();
  const { preferences, loading, error, retry } = usePreferences();
  const token = session?.access_token;
  const [recommended, setRecommended] = useState<EventideEvent[]>([]);
  const [selected, setSelected] = useState<EventideEvent | null>(null);

  useEffect(() => {
    // No one logged in
    if (!token) {
      setRecommended([]);
      return;
    }
    const controller = new AbortController();
    void getRecommendedEvents(token, { signal: controller.signal })
      .then((events) => {
        // load the recommended events
        if (!controller.signal.aborted) setRecommended(events.map(toEventideEvent));
      })
      .catch(() => {
        // Failed load leaves the section empty
      });

    return () => controller.abort();
  }, [token]);

  function onReject(id: number) {
    if (!token) return;
    // The rejection is done instantly upon button click
    setRecommended((current) => current.filter((event) => event.id !== id));
    setSelected(null);
    void rejectRecommendedEvent(id, token).catch(() => {});
  }

  if (checkingSession || !session) return null;
  return (
    <>
    <section aria-labelledby="discover-for-you">
      <h2 id="discover-for-you">
        For You <span>✦ Curated events</span>
      </h2>
      {error ? (
        <div className="discover-empty" role="alert">
          <p>Unable to load your preferences. {error}</p>
          <button className="pill" onClick={retry}>
            Retry
          </button>
        </div>
      ) : loading && !preferences ? (
        <p className="discover-empty" role="status">
          Loading your preferences…
        </p>
      ) : preferences?.onboarding_completed ? (
        recommended.length ? (
          <div className="discover-list">
            {recommended.map((event) => (
              <DiscoverEventCard
                key={event.id}
                event={event}
                saved={saved.includes(event.id)}
                onSave={onSave}
                onOpen={setSelected}
                onReject={onReject}
              />
            ))}
          </div>
        ) : (
          <div className="discover-empty">
            <p>
              Your preferences are saved. Personalized recommendations are coming
              soon.
            </p>
            <Link className="pill" to="/onboarding">
              Edit preferences
            </Link>
          </div>
        )
      ) : (
        <div className="discover-empty">
          <p>Complete the onboarding for personalized recommendations.</p>
          <Link className="pill" to="/onboarding">
            Start
          </Link>
        </div>
      )}
    </section>
    {selected && (
      <EventDetails
        event={selected}
        saved={saved.includes(selected.id)}
        onSave={onSave}
        onReject={onReject}
        onClose={() => setSelected(null)}
      />
    )}
    </>
  );
}
