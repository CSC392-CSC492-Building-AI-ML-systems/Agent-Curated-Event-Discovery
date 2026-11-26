import { useCallback, useContext, useEffect, useState } from "react";
import "./App.css";
import DiscoverPage from "./pages/DiscoverPage";
import YourEventsPage from "./pages/YourEventsPage/YourEventsPage";
import TagPage from "./pages/TagPage";
import MapPage from "./pages/MapPage/MapPage";
import EventPage from "./pages/EventPage/EventPage";
import SignupPage from "./pages/SignupPage/SignupPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PreferencesProvider, usePreferences } from "./contexts/PreferencesContext";
import { SavedEventsProvider } from "./contexts/SavedEventsContext";
import useEvents, { useEventsSaved } from "./hooks/useEvents";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import type { BrowseState, EventideTag } from "./interfaces/interfaces";
import { eventSaved } from "./api/user_actions";
import { createClient } from "./lib/supabase/client";
import { ApiError } from "./api/client";
import Popup from "./components/Popup";
import CalendarProvider from "./contexts/CalendarProvider";
import { useNavigate } from "react-router-dom";
import { INITIAL_FILTERS } from "./interfaces/constants";

function App() {
  return <AuthProvider><PreferencesProvider><BrowserRouter><SessionRoutes /></BrowserRouter></PreferencesProvider></AuthProvider>;
}

function SessionRoutes() {
  const { session } = useAuth();
  // Do not carry account-specific in-memory selections into a different login.
  return (
    <CalendarProvider key={session?.user.id ?? "guest"}>
      <EventRoutes />
    </CalendarProvider>
  );
}

function EventRoutes() {
  const navigate = useNavigate();
  const pathname = useLocation()
  
  const preferences = usePreferences().preferences
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const handlePopupClose = useCallback(() => setShowPopup(false), []);
  <button onClick={() => setShowPopup(true)}>Save</button>;

  const { events, loading, error, retry } = useEvents();
  const {session} = useAuth();
  // hooks always run, in the same order every render
  const savedInfo = useEventsSaved(session?.access_token?? null);
  
  
  const [followed, setFollowed] = useState<EventideTag[]>([]);
  const [browse, setBrowse] = useState<BrowseState>(INITIAL_FILTERS);

  const onFollow = (tag: EventideTag) =>
    setFollowed((current) =>
      current.some((selectedTag) => selectedTag.id === tag.id)
        ? current.filter((value) => value.id !== tag.id)
        : [...current, tag],
    );
  const storageKey = session ? `eventide:saved:${session.user.id}` : null;
  const [saved, setSaved] = useState<number[]>(() => {
    try {
      return storageKey
        ? JSON.parse(localStorage.getItem(storageKey) ?? "[]")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(saved));
  }, [storageKey, saved]);
  const onSave = async (id: number) => {
    const save = !saved.includes(id);
    setSaved(save ? [...saved, id] : saved.filter((value) => value !== id));
    const event = events.find((event) => event.id === id);
    if (event ) {if (save) {event.saves +=1} else{event.saves -= 1} }
    const controller = new AbortController();
    try {
        const { data, error } = await createClient().auth.getSession();
        if (controller.signal.aborted) return;
        if (error || !data.session?.access_token) throw new ApiError(401, "Please log in again before saving your preferences.");
        const result = await eventSaved(save? "PUT": "DELETE", { id: id }, data.session?.access_token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Object.hasOwn(result, 'message')) throw new Error("Could not save event. Please retry."); //result only has attribute 'message' on success, for error responses it uses 'detail'
      } catch (error) {
        if (!controller.signal.aborted) {
          setShowPopup(true);
          setPopupMessage("Could not save event. Please retry later.")
        }
        if (event ) {if (save) {event.saves -=1} else{event.saves += 1} }
        setSaved(save ? saved.filter((value) => value !== id): [...saved, id]);
      } 
    }
  
  useEffect(()=>{
    const saved = savedInfo.events.map((e) => e.id);
    setSaved(saved);
  }, [savedInfo.events]);

  const eventProps = {
    events,
    saved,
    onSave,
    followed,
    onFollow,
    loading,
    error,
    retry,
    browse,
    setBrowse,
  };

  const savedEventProps = {
    events,
    saved,
    onSave,
    followed,
    onFollow,
    loadingSaved: savedInfo.loading,
    errorSaved: savedInfo.error,
    retrySaved: savedInfo.retry,
    browse,
    setBrowse,
  };


  useEffect(() => {
  if (preferences?.onboarding_completed === false && pathname.pathname !== "/onboarding") {
    navigate("/onboarding", { replace: true });
  }
}, [preferences, pathname, navigate]);
  return (
    <>
    <SavedEventsProvider events={events} saved={saved} onSave={onSave}>
      <Routes>
        <Route path="/" element={<DiscoverPage {...eventProps} />} />
        <Route path="/tags/:tagId" element={<TagPage {...eventProps} />} />
        <Route path="/map" element={<MapPage {...eventProps} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/events/:eventId"
          element={<EventPage saved={saved} onSave={onSave} />}
        />
        <Route path="/profile" element={<ProfilePage route="settings" />} />
        <Route
          path="/profile/friends"
          element={<ProfilePage route="friends" />}
        />
        <Route
          path="/profile/availability"
          element={<ProfilePage route="availability" />}
        />
        <Route
          path="/profile/security"
          element={<ProfilePage route="security" />}
        />
        <Route path="/saves" element={<YourEventsPage {...savedEventProps} route="saves"/>}/>
        <Route path="/calendar" element={<YourEventsPage {...savedEventProps} route="calendar"/>}/>
      </Routes>
    </SavedEventsProvider>
      <Popup visible={showPopup} message={popupMessage} duration={3000} onClose={handlePopupClose}/>
    </>
  );
}

export default App;
