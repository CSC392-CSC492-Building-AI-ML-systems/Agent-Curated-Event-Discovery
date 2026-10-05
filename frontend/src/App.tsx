import { useEffect, useState } from 'react';
import './App.css';
import type { EventideEvent } from './interfaces/interfaces';
import DiscoverPage from './pages/DiscoverPage';
import MapPage from './pages/MapPage';
import {BrowserRouter, Route, Routes} from 'react-router-dom';

function App() {
  const [events, setEvents] = useState<EventideEvent[]>([]);
  useEffect(() => {
      //all the initial fetches would go here
      setEvents([{ key: 1, id: 1, title: "Event 1", description: "This is the first event." }]);
    }, []
  )
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiscoverPage events={events}/>} /> 
        <Route path="/map" element={<MapPage/>} /> 
      </Routes>
    </BrowserRouter>
  )
}

export default App
