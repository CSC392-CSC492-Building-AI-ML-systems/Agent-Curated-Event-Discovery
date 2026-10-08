import { useState } from 'react';
import './App.css';
import DiscoverPage from './pages/DiscoverPage';
import YourEventsPage from './pages/YourEventsPage';
import MapPage from './pages/MapPage';
import { createDiscoverEvents } from './data/discoverEvents';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  const [events] = useState(createDiscoverEvents);
  const [saved, setSaved] = useState<number[]>([]);
  const onSave = (id: number) => setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const eventProps = { events, saved, onSave };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiscoverPage {...eventProps} />} />
        <Route path="/your-events" element={<YourEventsPage {...eventProps} />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
