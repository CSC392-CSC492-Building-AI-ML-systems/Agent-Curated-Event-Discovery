import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfilePage() {
  const auth = useAuth();
  return <main className="profile-content">
            <h1>Your Saves</h1>
            {auth.loading ? <p role="status">Checking login…</p> : !auth.session ? <p>Log in to view your profile. <Link to="/login" state={{ returnTo: "/profile" }}>Log in</Link></p>
              : 
              // {catalogue.loading ? <p>"Loading interests…"</p> : }
              <div className="grid">
                  
              </div>
              }
          </main>
}
