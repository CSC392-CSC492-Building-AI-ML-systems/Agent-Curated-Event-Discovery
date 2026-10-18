import { Link, NavLink, useLocation } from "react-router-dom";
import EventideLogo from "./EventideLogo";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function NavBar({ savedCount }: { savedCount?: number }) {
  const location = useLocation();
  return (
    <div className="navbar">
      <nav aria-label="Main navigation">
        <NavLink
          to="/"
          className={
            location.pathname === "/map"
              ? "active"
              : ""
          }
        >
          Discover
        </NavLink>
        <NavLink to="/your-events">
          Your Events{savedCount ? ` (${savedCount})` : ""}
        </NavLink>
      </nav>
    </div>
  );
}

export function Header({ savedCount }: { savedCount?: number }) {
  const { session, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try { await signOut(); }
    catch { setError("Unable to log out. Please try again."); }
    finally { setSigningOut(false); }
  }

  return (
    <header className="discover-header">
      <EventideLogo />
      <NavBar savedCount={savedCount} />{" "}
      <div className="header-account">
        {loading ? <span role="status">Checking login…</span> : session ? <>
          <Link className="discover-auth-button" to="/profile">Profile</Link>
          <button className="pill" disabled={signingOut} onClick={handleSignOut}>{signingOut ? "Logging out…" : "Log out"}</button>
        </> : <Link className="discover-auth-button" to="/signup">Sign Up / Log In</Link>}
        {error && <span role="alert">{error}</span>}
      </div>
    </header>
  );
}
