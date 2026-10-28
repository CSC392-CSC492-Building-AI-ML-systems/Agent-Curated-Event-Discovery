import { Link } from "react-router-dom";
import { Header, ProfileNavBar } from "../../components/NavBar";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import useTags from "../../hooks/useTags";
import { AGE_GROUPS, BUDGETS } from "../../data/onboardingOptions";
import "../DiscoverPage.css";
import "./ProfilePages.css";

export default function SettingsPage() {
  const auth = useAuth();
  const { preferences, loading, error, retry } = usePreferences();
  const catalogue = useTags(!!auth.session);
  return <main className="profile-content">
          <h1>Your Profile</h1>
          {auth.loading ? <p role="status">Checking login…</p> : !auth.session ? <p>Log in to view your profile. <Link to="/login" state={{ returnTo: "/profile" }}>Log in</Link></p>
            : <>
              <p>{auth.session.user.email}</p>
              {loading && !preferences ? <p role="status">Loading preferences…</p> : error ? <div role="alert"><p>{error}</p><button className="pill" onClick={retry}>Retry</button></div>
                : preferences?.onboarding_completed ? <>
                  <dl className="profile-preferences">
                    <dt>Age group</dt><dd>{AGE_GROUPS.find(option => option.value === preferences.age_group)?.label ?? "No preference"}</dd>
                    <dt>Budget</dt><dd>{BUDGETS.find(option => option.value === preferences.budget)?.label ?? "No preference"}</dd>
                    <dt>Interests</dt><dd>{catalogue.loading ? "Loading interests…" : preferences.interest_tag_ids.map(id => catalogue.tags.find(tag => tag.id === id)?.name ?? `Tag ${id}`).join(", ")}</dd>
                  </dl>
                  {catalogue.error && <p role="alert">Unable to load interest names. <button className="pill" onClick={catalogue.retry}>Retry</button></p>}
                  <Link className="pill" to="/onboarding">Edit preferences</Link>
                </> : <Link className="pill" to="/onboarding">Complete onboarding</Link>}
            </>}
        </main>
}
