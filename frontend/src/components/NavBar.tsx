import { Link, NavLink, useLocation } from "react-router-dom";

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
      <NavLink className="logo" to="/">
        even<i>tide</i>
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" />
        </svg>
      </NavLink>
      <NavBar savedCount={savedCount} />{" "}
      <Link className="discover-auth-button" to="/signup">
        Sign Up / Log In
      </Link>
    </header>
  );
}
