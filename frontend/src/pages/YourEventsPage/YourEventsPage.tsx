import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Header, YourEventsNavBar } from "../../components/NavBar";
import EventRequestState from "../../components/EventRequestState";
import type { EventPageProps } from "../../interfaces/interfaces";
import SavesPage from "./SavesPage";
import LikesPage from "./LikesPage";
import CalendarPage from "./CalendarPage";
import "../DiscoverPage.css";
import "./YourEventsPage.css";


type YourEventsPageProps = EventPageProps 
export default function YourEventsPage({
  events,
  saved,
  onSave,
  liked, 
  onLike,
  loading,
  error,
  retry,
  route
}: YourEventsPageProps & {route: string}) {

  function routePage(route: string){
    if (route === "likes") {
        return <LikesPage events={events} saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }else if (route === "saves") {
        return <SavesPage events={events} saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }else if (route === "calendar") {
        return <CalendarPage events={events} saved={saved} onSave={onSave} liked={liked} onLike={onLike}/>
    }
  }
  const location = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, location.state?.returnScroll || 0),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.state]);
  
  return (
    <div className="discover-page">
      <div className="discover-wrap">
        <Header savedCount={saved.length} />
        <main>
          <YourEventsNavBar route={route}/>
          <EventRequestState loading={loading} error={error} retry={retry} />
          {!loading &&
            !error &&
            routePage(route)
          }
        </main>
      </div>
    </div>
  );
}
