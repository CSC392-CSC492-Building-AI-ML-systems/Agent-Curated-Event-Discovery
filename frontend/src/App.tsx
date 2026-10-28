import { useState } from "react";
import "./App.css";
import DiscoverPage from "./pages/DiscoverPage";
import YourEventsPage from "./pages/YourEventsPage";
import TagPage from "./pages/TagPage";
import MapPage from "./pages/MapPage/MapPage";
import SignupPage from "./pages/SignupPage/SignupPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePages/ProfilePage";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import useEvents from "./hooks/useEvents";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { BrowseState, EventideTag } from "./interfaces/interfaces";

function App() {
  return <AuthProvider><PreferencesProvider><BrowserRouter><SessionRoutes /></BrowserRouter></PreferencesProvider></AuthProvider>;
}

function SessionRoutes() {
  const { session } = useAuth();
  // Do not carry account-specific in-memory selections into a different login.
  return <EventRoutes key={session?.user.id ?? "guest"} />;
}

function EventRoutes() {
  const { events, loading, error, retry } = useEvents();
  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);
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
  const onSave = (id: number) =>
    setSaved((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const [liked, setLiked] = useState<number[]>([]);
  const onLike = (id: number) =>
    setLiked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
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
  return (
      <Routes>
        <Route path="/" element={<DiscoverPage {...eventProps} />} />
        <Route
          path="/your-events"
          element={
            <YourEventsPage
              {...eventProps}
              view={calendarView}
              setView={setCalendarView}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
            />
          }
        />
        <Route path="/tags/:tagId" element={<TagPage {...eventProps} />} />
        <Route path="/map" element={<MapPage {...eventProps} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/profile" element={<ProfilePage route="settings" />} />
        <Route path="/likes" element={<ProfilePage route="likes" />} />
        <Route path="/saves" element={<ProfilePage route="saves" />} />
      </Routes>
  );
}

export default App;
