import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header, YourEventsNavBar } from "../../components/NavBar";
import EventRequestState from "../../components/EventRequestState";
import SavesPage from "./SavesPage";
import LikesPage from "./LikesPage";
import CalendarPage from "./CalendarPage";
import "../DiscoverPage.css";
import "./YourEventsPage.css";
import type { EventideEvent } from "../../interfaces/interfaces";
import { useAuth } from "../../contexts/AuthContext";


type YourEventsPageProps = {
  events: EventideEvent[];
  saved: number[];
  onSave: (id: number) => void;
  liked: number[];
  onLike: (id: number) => void;
  loadingLiked: boolean;
  errorLiked: string | null;
  retryLiked: (token: string | null)=> void;
  loadingSaved: boolean;
  errorSaved: string | null;
  retrySaved: (token: string | null)=> void;
  route: string;
}
export default function YourEventsPage({
events,
  saved,
  onSave,
  liked, 
  onLike,
  loadingLiked,
  errorLiked,
  retryLiked,
  loadingSaved,
  errorSaved,
  retrySaved,
  route
}: YourEventsPageProps) {
  const {session} = useAuth();
  const accessToken = session?.access_token;
  function routePage(route: string){
    if (route === "likes") {
        return <LikesPage events={events} saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }else if (route === "saves") {
        return <SavesPage events={events} saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }else if (route === "calendar") {
        return <CalendarPage saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }
  }
  const location = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, location.state?.returnScroll || 0),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.state]);
  
  const error = route === "calendar" ? null : route === "likes" ? errorLiked : errorSaved;
  const loading = route === "calendar" ? false : route === "likes" ? loadingLiked : loadingSaved;

  return (
    <div className="discover-page">
      <div className="discover-wrap">
        <Header savedCount={saved.length} />
        <main>
          <YourEventsNavBar route={route}/>
          <EventRequestState loading={loading} error={error} retry={()=>{retryLiked(accessToken??null);retrySaved(accessToken??null);}} />
          {!(loading) &&
            !(error) &&
            routePage(route)
          }
        </main>
      </div>
    </div>
  );
}
