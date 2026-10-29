import { useCallback, useEffect, useState } from "react";
import "./App.css";
import DiscoverPage from "./pages/DiscoverPage";
import YourEventsPage from "./pages/YourEventsPage/YourEventsPage";
import TagPage from "./pages/TagPage";
import MapPage from "./pages/MapPage/MapPage";
import SignupPage from "./pages/SignupPage/SignupPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import useEvents, { useEventsLiked, useEventsSaved } from "./hooks/useEvents";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { BrowseState, EventideTag } from "./interfaces/interfaces";
import { eventLiked, eventSaved } from "./api/user_actions";
import { createClient } from "./lib/supabase/client";
import { ApiError } from "./api/client";
import Popup from "./components/Popup";

function App() {
  return <AuthProvider><PreferencesProvider><BrowserRouter><SessionRoutes /></BrowserRouter></PreferencesProvider></AuthProvider>;
}

function SessionRoutes() {
  const { session } = useAuth();
  // Do not carry account-specific in-memory selections into a different login.
  return <EventRoutes key={session?.user.id ?? "guest"} />;
}

function EventRoutes() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const handlePopupClose = useCallback(() => setShowPopup(false), []);
  <button onClick={() => setShowPopup(true)}>Save</button>

  const { events, loading, error, retry } = useEvents();
  const {session} = useAuth();
  // hooks always run, in the same order every render
  const likedInfo = useEventsLiked(session?.access_token?? null);
  const savedInfo = useEventsSaved(session?.access_token?? null);
  
  
  const [followed, setFollowed] = useState<EventideTag[]>([]);
  const [browse, setBrowse] = useState<BrowseState>({
    search: "",
    range: "30",
    sort: "upcoming",
    tags: [] as EventideTag[],
  });

  const onFollow = (tag: EventideTag) =>
    setFollowed((current) =>
      current.some((selectedTag) => selectedTag.id === tag.id)
        ? current.filter((value) => value.id !== tag.id)
        : [...current, tag],
    );
  const [saved, setSaved] = useState<number[]>([]);
  const onSave = async(id: number) => {
    const save = !saved.includes(id);
    setSaved(save ? [...saved, id]: saved.filter((value) => value !== id)
    );
    const event = events.find((event) => event.id === id);
    if (event ) {if (save) {event.saves +=1} else{event.saves -= 1} }
    const controller = new AbortController();
    try {
        const { data, error } = await createClient().auth.getSession();
        if (controller.signal.aborted) return;
        if (error || !data.session?.access_token) throw new ApiError(401, "Please log in again before saving your preferences.");
        const result = await eventSaved(save? "PUT": "DELETE", { id: id }, data.session?.access_token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!result.message) throw new Error("Could not save event. Please retry.");
      } catch (error) {
        if (!controller.signal.aborted) {
          setShowPopup(true);
          setPopupMessage("Could not save event. Please retry later.")
        }
        if (event ) {if (save) {event.saves -=1} else{event.saves += 1} }
        setSaved(save ? saved.filter((value) => value !== id): [...saved, id]);
      } 
    }
  const [liked, setLiked] = useState<number[]>([]);
  const onLike = async(id: number) =>{
    const like = !liked.includes(id)
    setLiked(like ? [...liked, id]: liked.filter((value) => value !== id));
    const event = events.find((event) => event.id === id);
    if (event ) {if (like) {event.likes +=1} else{event.likes -= 1} }
    const controller = new AbortController();
    try {
      const { data, error } = await createClient().auth.getSession();
      if (controller.signal.aborted) return;
      if (error || !data.session?.access_token) throw new ApiError(401, "Please log in again before saving your preferences.");
      const result = await eventLiked(like? "PUT": "DELETE", { id: id }, data.session?.access_token, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!result.message) throw new Error("Could not save event. Please retry.");
    } catch (error) {
      if (!controller.signal.aborted) {
        setShowPopup(true);
        setPopupMessage("Could not like event. Please retry later.")
      }
      if (event ) {if (like) {event.likes -=1} else{event.likes += 1} }
      setLiked(like ? liked.filter((value) => value !== id): [...liked, id]);
    } 
  }
  
  useEffect(()=>{
    const liked = likedInfo.events.map((e) => e.id);
    setLiked(liked);
  }, [likedInfo.events])
  useEffect(()=>{
    const saved = savedInfo.events.map((e) => e.id);
    setSaved(saved);
  }, [savedInfo.events])

  const eventProps = {
    events,
    saved,
    onSave,
    liked,
    onLike,
    followed,
    onFollow,
    loading,
    error,
    retry,
    browse,
    setBrowse,
  };

  const likedSavedEventProps = {
    events,
    saved,
    onSave,
    liked,
    onLike,
    followed,
    onFollow,
    loadingLiked: likedInfo.loading,
    loadingSaved: savedInfo.loading,
    errorLiked: likedInfo.error,
    errorSaved: savedInfo.error,
    retryLiked: likedInfo.retry,
    retrySaved: savedInfo.retry,
    browse,
    setBrowse,
  };
  return (
    <>
      <Routes>
        <Route path="/" element={<DiscoverPage {...eventProps} />} />
        <Route path="/tags/:tagId" element={<TagPage {...eventProps} />} />
        <Route path="/map" element={<MapPage {...eventProps} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/profile" element={<ProfilePage route="settings" />} />
        {/* <Route path="/likes" element={<ProfilePage route="likes" />} />
        <Route path="/saves" element={<ProfilePage route="saves" />} /> */}
        <Route path="/saves" element={<YourEventsPage {...likedSavedEventProps} route="saves"/>}/>
        <Route path="/likes" element={<YourEventsPage {...likedSavedEventProps} route="likes"/>}/>
        <Route path="/calendar" element={<YourEventsPage {...likedSavedEventProps} route="calendar"/>}/>
      </Routes>
      <Popup visible={showPopup} message={popupMessage} duration={3000} onClose={handlePopupClose}/>
    </>
  );
}

export default App;
