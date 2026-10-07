import './App.css';
import DiscoverPage from './pages/DiscoverPage';
import MapPage from './pages/MapPage';
import {BrowserRouter, Route, Routes} from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiscoverPage/>} /> 
        <Route path="/map" element={<MapPage/>} /> 
      </Routes>
    </BrowserRouter>
  )
}

export default App
