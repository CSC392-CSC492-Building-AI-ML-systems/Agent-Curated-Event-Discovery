import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function SecurityPage() {
  const { session, loading } = useAuth();
  return <main className="profile-content profile-settings-content">
    <h1>Account security</h1>
    {loading ? <p role="status">Checking login…</p> : !session ? <p>
      Log in to view your account settings. <Link to="/login" state={{ returnTo: "/profile/security" }}>Log in</Link>
    </p> : <>
      <p>{session.user.email}</p>
      <p>Email and password settings are coming soon.</p>
    </>}
  </main>;
}
