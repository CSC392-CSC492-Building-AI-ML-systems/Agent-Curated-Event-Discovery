import { useEffect, useState, useRef } from "react";
import NavBar from "../components/NavBar";
import type { EventideEvent } from "../interfaces/interfaces";
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';

function MapPage(){
    const [events, setEvents] = useState<EventideEvent[]>([]);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    console.log('vite' + import.meta.env.MAPBOX_TOKEN)
    useEffect(() => {
        //all the initial fetches would go here
        setEvents([{ key: 1, id: 1, title: "Event 1", description: "This is the first event." }]);
        //create map
        if (!mapContainerRef.current) return;
        mapRef.current = new mapboxgl.Map({
            accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
            container: mapContainerRef.current,
            center: [-79.34, 43.64],
            zoom: 10.12
        });
        return () => {
            mapRef.current?.remove()
        }
    }, []);
    return <>
        <NavBar/>
        <div className="container">
            <h1>
                Map Page
            </h1>
            <div ref={mapContainerRef} className="mapContainer" />
        </div>
    </>
}
export default MapPage;