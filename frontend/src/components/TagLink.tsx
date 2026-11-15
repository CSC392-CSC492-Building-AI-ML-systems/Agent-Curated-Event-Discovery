import { Link, useLocation } from "react-router-dom";
import type { EventideTag } from "../interfaces/interfaces";
import { useAnalytics } from "../hooks/useAnalytics";

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
  const { logTagClick } = useAnalytics();
  const handleTagOpen = (tag: EventideTag) => {
    void logTagClick(Number(tag.id)).catch((error) => {
      console.error("Failed to track tag click:", error);
    });

    if (onNavigate) onNavigate();
  };

  return (
    <Link
      className="discover-chip discover-tag-link"
      to={`/tags/${tag.id}`}
      state={{ origin }}
      onClick={() => handleTagOpen(tag)}
    >
      #{tag.name}
    </Link>
  );
}
