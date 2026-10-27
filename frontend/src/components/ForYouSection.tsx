import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePreferences } from "../contexts/PreferencesContext";

export default function ForYouSection() {
  const { session, loading: checkingSession } = useAuth();
  const { preferences, loading, error, retry } = usePreferences();
  if (checkingSession || !session) return null;
  return (
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
        <div className="discover-empty">
          <p>
            Your preferences are saved. Personalized recommendations are coming
            soon.
          </p>
          <Link className="pill" to="/onboarding">
            Edit preferences
          </Link>
        </div>
      ) : (
        <div className="discover-empty">
          <p>Complete the onboarding for personalized recommendations.</p>
          <Link className="pill" to="/onboarding">
            Start
          </Link>
        </div>
      )}
    </section>
  );
}
