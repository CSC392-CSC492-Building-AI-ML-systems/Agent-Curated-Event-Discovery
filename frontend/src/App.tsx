import { useState } from 'react';
import './App.css';
import DiscoverPage from './pages/DiscoverPage';
import YourEventsPage from './pages/YourEventsPage';
import TagPage from './pages/TagPage';
import MapPage from './pages/MapPage';
import useEvents from './hooks/useEvents';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  const { events, loading, error, retry } = useEvents();
  const [calendarView, setCalendarView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [browse, setBrowse] = useState({ search: '', range: '30', sort: 'upcoming', categories: [] as string[] });
  const onFollow = (tag: string) => setFollowed(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag]);
  const [saved, setSaved] = useState<number[]>([]);
  const onSave = (id: number) => setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const eventProps = { events, saved, onSave, followed, onFollow, loading, error, retry };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiscoverPage {...eventProps} browse={browse} setBrowse={setBrowse} />} />
        <Route path="/your-events" element={<YourEventsPage {...eventProps} view={calendarView} setView={setCalendarView} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} />} />
        <Route path="/tags/:tag" element={<TagPage {...eventProps} />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
