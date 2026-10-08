import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function TagLink({ tag, onNavigate }: { tag: string; onNavigate?: () => void }) {
    const location = useLocation();
    const navigate = useNavigate();
    const origin = location.pathname.startsWith('/tags/')
        ? location.state?.origin
        : { path: location.pathname + location.search, scroll: typeof window === 'undefined' ? 0 : window.scrollY };
    return <Link className="discover-chip discover-tag-link" to={`/tags/${encodeURIComponent(tag)}`} state={{ origin }} onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const destinationOrigin = location.pathname.startsWith('/tags/') ? origin : { ...origin, scroll: window.scrollY };
        onNavigate?.();
        void navigate(`/tags/${encodeURIComponent(tag)}`, { state: { origin: destinationOrigin } });
    }}>#{tag}</Link>;
}
