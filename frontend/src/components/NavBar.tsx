import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import EventideLogo from "./EventideLogo";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import SaveIcon from '../assets/images/save-icon.svg?react';
import SaveIconFilled from '../assets/images/save-icon-filled.svg?react';
import HeartIcon from '../assets/images/heart-icon.svg?react';
import HeartIconFilled from '../assets/images/heart-icon-filled.svg?react';
import SettingIcon from '../assets/images/setting-icon.svg?react';
import SettingIconFilled from '../assets/images/setting-icon-filled.svg?react';
import CalendarIcon from '../assets/images/calendar-icon.svg?react';

export default function NavBar({ savedCount }: { savedCount?: number }) {
  const location = useLocation();
  const { session } = useAuth();
  const navigate = useNavigate();
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
        {session?.access_token? <NavLink 
          to="/saves"
          className={
            location.pathname === "/likes" || location.pathname === "/calendar"
              ? "active"
              : ""
          }
          >
          Your Events{savedCount ? ` (${savedCount})` : ""}
        </NavLink>: 
        <NavLink 
          to="/login"
          >
          Your Events
        </NavLink>
        }
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

export function ProfileNavBar ({ route }: { route: string }) {
  return <div>
            <nav aria-label="Main navigation" className="profile-navbar">
              <NavLink to="/profile">
                {route == "settings" ? <SettingIconFilled className="setting-icon"/>: <SettingIcon className="setting-icon"/> }
             </NavLink>
              <NavLink to="/likes">
                {route == "likes" ? <HeartIconFilled className="heart-icon"/>: <HeartIcon className="heart-icon"/> }
              </NavLink>
              <NavLink to="/saves">
                {route == "saves" ? <SaveIconFilled className="save-icon"/>: <SaveIcon className="save-icon"/> }
              </NavLink>
            </nav>
          </div>
}

export function YourEventsNavBar ({ route }: { route: string }) {
  return <div>
            <nav aria-label="Main navigation" className="your-events-switch">
              <NavLink to="/saves" className={`pill ${route === "saves" ? "active" : ""}`} aria-pressed={route === "saves"}>
                <SaveIcon width="20px" height="20px" color={route === "saves" ? "white": "black"}  className="save-icon"/><p>Saved</p>
              </NavLink>
              <NavLink to="/likes" className={`pill ${route === "likes" ? "active" : ""}`} aria-pressed={route === "likes"}>
                <HeartIcon  width="20px" height="20px" color={route === "likes" ? "white": "black"} className="heart-icon"/><p>Liked</p>
              </NavLink>
              <NavLink to="/calendar" className={`pill ${route === "calendar" ? "active" : ""}`} aria-pressed={route === "calendar"}>
                <CalendarIcon  width="20px" height="20px" color={route === "calendar" ? "white": "black"}  className="save-icon"/><p>Your Calendar</p>
              </NavLink>
            </nav>
          </div>
}

