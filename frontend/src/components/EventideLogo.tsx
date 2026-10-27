import { Link } from "react-router-dom";

export default function EventideLogo() {
  return (
    <Link className="logo" to="/" aria-label="Eventide home">
      even<i>tide</i>
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" />
      </svg>
    </Link>
  );
}
