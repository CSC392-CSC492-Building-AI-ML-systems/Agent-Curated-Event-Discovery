import { Link } from "react-router-dom";
import { availabilityToSelection, selectionToAvailability } from "../../utils/availability";
import WeeklyAvailabilitySelector from "../../components/WeeklyAvailabilitySelector";
import useAvailability from "../../hooks/useAvailability";
import { useAuth } from "../../contexts/AuthContext";
import "../DiscoverPage.css";
import "./ProfilePages.css";

function AvailabilityEditor({ userId }: { userId: string }) {
  const { state, saveState, dirty, edit, save, retry } = useAvailability(userId);
  if (state.status === "loading") return <p role="status">Loading schedule…</p>;
  if (state.status === "error") return <div role="alert">
    <p>{state.message}</p>
    <button type="button" className="pill" onClick={retry}>Retry availability</button>
  </div>;

  const saving = saveState.status === "saving";
  return <>
    <WeeklyAvailabilitySelector value={availabilityToSelection(state.schedule)}
      onChange={slots => edit(selectionToAvailability(slots))} disabled={saving}
      actions={<button type="button" className={`pill${dirty ? " active" : ""}`} disabled={saving} aria-busy={saving}
        onClick={() => { void save(); }}>
        {saveState.status === "error" ? "Retry save" : "Save schedule"}
      </button>} />
    <div className="availability-feedback">
      {saving && <p role="status">Saving…</p>}
      {saveState.status === "saved" && <p role="status">Schedule saved.</p>}
      {saveState.status === "error" && <p role="alert">{saveState.message}</p>}
    </div>
  </>;
}

export default function AvailabilityPage() {
  const auth = useAuth();
  return (
    <main className="profile-content availability-content">
      <h1>Availability</h1>
      {auth.loading ? <p role="status">Checking login…</p> : auth.error ? <div role="alert">
        <p>{auth.error}</p><button type="button" className="pill" onClick={auth.retry}>Retry login</button>
      </div> : !auth.session ? (
        <p>Log in to manage your availability. <Link to="/login" state={{ returnTo: "/profile/availability" }}>Log in</Link></p>
      ) : <AvailabilityEditor key={auth.session.user.id} userId={auth.session.user.id} />}
    </main>
  );
}
