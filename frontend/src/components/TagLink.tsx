import { Link, useLocation } from "react-router-dom";
import type { EventideTag } from "../interfaces/interfaces";

interface TagLinkProps {
  tag: EventideTag;
  onNavigate?: () => void;
}

export default function TagLink({ tag, onNavigate }: TagLinkProps) {
  const location = useLocation();
  const origin = location.pathname.startsWith("/tags/")
    ? location.state?.origin
    : {
        path: location.pathname + location.search,
        scroll: typeof window === "undefined" ? 0 : window.scrollY,
      };
  return (
    <Link
      className="discover-chip discover-tag-link"
      to={`/tags/${tag.id}`}
      state={{ origin }}
      onClick={onNavigate}
    >
      #{tag.name}
    </Link>
  );
}
