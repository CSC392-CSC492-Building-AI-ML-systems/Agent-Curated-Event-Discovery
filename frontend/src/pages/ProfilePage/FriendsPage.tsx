import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../DiscoverPage.css";
import "./ProfilePages.css";
import FriendsPanel from "../../components/FriendsPanel";

export default function FriendsPage() {
  const { session, loading, error, retry } = useAuth();

  return <main className="profile-content profile-settings-content">
    <h1>Friends</h1>
    {loading ? <p role="status">Checking login…</p>
      : error ? <div role="alert"><p>{error}</p>
        <button type="button" className="pill" onClick={retry}>Retry login</button></div>
      : !session ? <p>Log in to view your friends. <Link to="/login" state={{ returnTo: "/profile/friends" }}>Log in</Link></p>
      : <FriendsPanel accessToken={session.access_token} />}
  </main>;
}
