import { Link, NavLink, useLocation } from "react-router-dom";
import EventideLogo from "./EventideLogo";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import SaveIcon from '../assets/images/save-icon.svg?react';
import HeartIcon from '../assets/images/heart-icon.svg?react';
import CalendarIcon from '../assets/images/calendar-icon.svg?react';
import { Bookmark, CalendarDays, Clock, Heart, Shield, UserRound, Users } from "lucide-react";

export default function NavBar({ savedCount }: { savedCount?: number }) {
  const location = useLocation();
  const { session } = useAuth();
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

export function ProfileNavBar() {
  return <nav aria-label="Profile navigation" className="profile-navbar">
    <NavLink to="/profile" end aria-label="Profile settings" title="Profile">
      <UserRound size={35} aria-hidden="true" />
    </NavLink>
    <NavLink to="/profile/availability" aria-label="Availability" title="Availability">
      <Clock size={35} aria-hidden="true" />
    </NavLink>
    <NavLink to="/profile/security" aria-label="Account security" title="Account security">
      <Shield size={35} aria-hidden="true" />
    </NavLink>
    <NavLink to="/likes" aria-label="Liked events" title="Liked events">
      <Heart size={35} aria-hidden="true" />
    </NavLink>
    <NavLink to="/saves" aria-label="Saved events" title="Saved events">
      <Bookmark size={35} aria-hidden="true" />
    </NavLink>
    <NavLink to="/calendar" aria-label="Your Calendar" title="Your Calendar">
      <CalendarDays size={35} aria-hidden="true" />
    </NavLink>
    <button type="button" disabled aria-label="Friends (coming soon)" title="Friends (coming soon)">
      <Users size={35} aria-hidden="true" />
    </button>
  </nav>;
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

