import { NavLink } from 'react-router-dom';

export default function Navbar({ savedCount }: { savedCount?: number }) {
    return <div className="navbar">
        <nav aria-label="Main navigation">
            <NavLink to="/" end>Discover</NavLink>
            <NavLink to="/your-events">Your Events{savedCount ? ` (${savedCount})` : ''}</NavLink>
        </nav>
    </div>;
}
