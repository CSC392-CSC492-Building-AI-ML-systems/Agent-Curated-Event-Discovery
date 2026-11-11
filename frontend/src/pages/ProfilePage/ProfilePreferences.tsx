import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { usePreferences } from "../../contexts/PreferencesContext";
import useTags from "../../hooks/useTags";
import { AGE_GROUPS, BUDGETS } from "../../data/onboardingOptions";

export default function ProfilePreferences() {
  const { preferences, loading, error, retry } = usePreferences();
  const catalogue = useTags();
  let content: ReactNode;

  if (loading && !preferences) {
    content = <p role="status">Loading preferences…</p>;
  } else if (error) {
    content = <div role="alert">
      <p>{error}</p><button type="button" className="pill" onClick={retry}>Retry</button>
    </div>;
  } else if (preferences?.onboarding_completed) {
    const interests = catalogue.loading
      ? "Loading interests…"
      : preferences.interest_tag_ids.map(id => catalogue.tags.find(tag => tag.id === id)?.name ?? `Tag ${id}`).join(", ");
    content = <>
      <dl className="profile-preferences profile-overview-preferences">
        <dt>Age group</dt><dd>{AGE_GROUPS.find(option => option.value === preferences.age_group)?.label ?? "No preference"}</dd>
        <dt>Budget</dt><dd>{BUDGETS.find(option => option.value === preferences.budget)?.label ?? "No preference"}</dd>
        <dt>Interests</dt><dd>{interests}</dd>
      </dl>
      {catalogue.error && <p role="alert">Unable to load interest names. <button type="button" className="pill" onClick={catalogue.retry}>Retry</button></p>}
    </>;
  } else {
    content = <>
      <p>Add your interests and preferences to personalise your recommendations.</p>
      <Link className="pill" to="/onboarding">Complete onboarding</Link>
    </>;
  }

  return <section className="profile-preferences-section" aria-labelledby="profile-preferences-title">
    <div className="profile-section-heading">
      <h2 id="profile-preferences-title">Preferences</h2>
      <Link className="profile-edit-button" to="/onboarding" aria-label="Edit preferences" title="Edit preferences">
        <Pencil size={23} aria-hidden="true" />
      </Link>
    </div>
    {content}
  </section>;
}
