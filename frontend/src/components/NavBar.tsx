import {Link} from "react-router-dom";
function Navbar() {
    return <div className="navbar">
                <nav>
                    <Link to="/">Discover</Link>
                    <Link to="/map">Map</Link>
                </nav>
            </div>
}
export default Navbar;