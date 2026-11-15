import { Header, ProfileNavBar } from "../../components/NavBar";
import SettingsPage from "./SettingsPage";
import LikesPage from "./LikesPage";
import SavesPage from "./SavesPage";
import AvailabilityPage from "./AvailabilityPage";

function routePage(route: string){
    if (route === "settings") {
        return <SettingsPage/>
    }else if (route === "likes") {
        return <LikesPage/>
    }else if (route === "saves") {
        return <SavesPage/>
    }else if (route === "availability") {
        return <AvailabilityPage/>
    }
}
export default function ProfilePage( {route}: {route: string} ) {
  return  <div className="discover-page">
            <div className="discover-wrap">
              <Header />
              <div className={`profile-wrap${route === "availability" ? " profile-availability-wrap" : ""}`}>
                <ProfileNavBar route={route}/>
                {routePage(route)}
              </div>
            </div>
          </div>
}
