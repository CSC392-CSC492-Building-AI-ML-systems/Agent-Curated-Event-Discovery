import { Header, ProfileNavBar } from "../../components/NavBar";
import SettingsPage from "./SettingsPage";
import LikesPage from "./LikesPage";
import SavesPage from "./SavesPage";
import AvailabilityPage from "./AvailabilityPage";
import SecurityPage from "./SecurityPage";

function routePage(route: string){
    if (route === "settings") {
        return <SettingsPage/>
    }else if (route === "likes") {
        return <LikesPage/>
    }else if (route === "saves") {
        return <SavesPage/>
    }else if (route === "availability") {
        return <AvailabilityPage/>
    }else if (route === "security") {
        return <SecurityPage/>
    }
}
export default function ProfilePage( {route}: {route: string} ) {
  return  <div className="discover-page">
            <div className="discover-wrap">
              <Header />
              <div className="profile-wrap">
                <ProfileNavBar/>
                {routePage(route)}
              </div>
            </div>
          </div>
}
