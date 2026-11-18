import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ProfileIdentity from "./ProfileIdentity";
import ProfilePreferences from "./ProfilePreferences";
import "../DiscoverPage.css";
import "./ProfilePages.css";

export default function SettingsPage() {
  const auth = useAuth();
  return <main className="profile-content profile-settings-content profile-overview-content">
    {auth.loading ? <><h1>Your Profile</h1><p role="status">Checking login…</p></>
      : auth.error ? <><h1>Your Profile</h1><div role="alert"><p>{auth.error}</p>
        <button type="button" className="pill" onClick={auth.retry}>Retry login</button></div></>
      : !auth.session ? <><h1>Your Profile</h1><p>Log in to view your profile. <Link to="/login" state={{ returnTo: "/profile" }}>Log in</Link></p></>
      : <>
        <ProfileIdentity key={auth.session.user.id} user={auth.session.user} />
        <hr className="profile-section-divider" />
        <ProfilePreferences />
      </>}
  </main>;
}
