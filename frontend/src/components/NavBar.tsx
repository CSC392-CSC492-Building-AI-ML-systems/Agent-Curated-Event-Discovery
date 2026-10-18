import { Link, NavLink, useLocation } from "react-router-dom";
import EventideLogo from "./EventideLogo";

export default function NavBar({ savedCount }: { savedCount?: number }) {
  const location = useLocation();
  return (
    <div className="navbar">
      <nav aria-label="Main navigation">
        <NavLink
          to="/"
          className={
            location.pathname === "/map" || location.pathname === "/map"
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
  return (
    <header className="discover-header">
      <EventideLogo />
      <NavBar savedCount={savedCount} />{" "}
      <Link className="discover-auth-button" to="/signup">
        Sign Up / Log In
      </Link>
    </header>
  );
}
