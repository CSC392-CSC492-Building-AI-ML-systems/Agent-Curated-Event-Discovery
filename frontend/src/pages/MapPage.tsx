import { useEffect, useState, useRef } from "react";
import NavBar from "../components/NavBar";
import SearchBar from "../components/SearchBar";
import Marker from "../components/Marker";
import type { EventideEvent, EventideFilters } from "../interfaces/interfaces";
import { INITIAL_FILTERS } from "../interfaces/constants";
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import {EventModuleSmall, EventInfoModule} from "../components/EventModules";
import closeIcon from '../assets/images/close-icon.svg';
import Filters, {FilterRow} from "../components/Filters";

const getLocation = (setLocation: Function) => {
    if (!navigator.geolocation){ console.log("Geolocation API not supported."); return;}
    if (!navigator.permissions || !navigator.permissions.query){ console.log("Permissions API not supported, cannot get geolocation"); return; }
    navigator.permissions.query({name: 'geolocation'}).then((result) => {
        if (result.state === 'granted'){
            navigator.geolocation.getCurrentPosition((position) => {setLocation([position.coords.longitude, position.coords.latitude])});
        }else if (result.state === 'prompt'){
            navigator.geolocation.getCurrentPosition((position) => {setLocation([position.coords.longitude, position.coords.latitude])}, (err)=>{console.error("Error prompting for geolocation: " + err.message)});
        }else if (result.state === 'denied'){
            console.log("User denied geolocation permissions.");
            alert("Your location settings are off. Please turn on location, it makes our map easier to use!")
        }
    }).catch((err) => {console.error("Error asking for geolocation perms:" + err)})
}

function MapPage(){
    //data states
    const [location, setLocation] = useState<[number, number]>([-79.34, 43.64]);
    const [events, setEvents] = useState<EventideEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number>(0);
    const [filteredEventIds, setFilteredEventIds] = useState<number[]>([])
    const [filters, setFilters] = useState<EventideFilters>(INITIAL_FILTERS);
    //setFilters({...filters, attribute_name: new_value}); for setting specific filter

    //UI states
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [listOpen, setListOpen] = useState<boolean>(true);
    const [infoOpen, setInfoOpen] = useState<boolean>(false);

    useEffect(() => {
        //all the initial fetches would go here
        setEvents([{ key: 1, id: 1, title: "Event 1", description: "This is the first event.", longitude: -79.34, latitude: 43.64, categories: ['tech'] }, { key: 2, id: 2, title: "Event 2", description: "This is the second event.", longitude: -79.34, latitude: 43.7, categories: ['food'] }]);
        
        //next check for location permissions
        getLocation(setLocation);

        //create map
        if (!mapContainerRef.current) return;
        mapRef.current = new mapboxgl.Map({
            accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
            container: mapContainerRef.current,
            center: location,
            zoom: 10.12
        });
        return () => {
            mapRef.current?.remove()
        }
    }, []);

    useEffect(() => {
        mapRef.current?.setCenter(location);
    }, location)
    
    return <>
            <div className="page">
                <NavBar/>
                <div className="container">
                    <h1>
                        Map Page
                    </h1>
                    <div ref={mapContainerRef} className="mapContainer" />
                    {mapRef.current && events && events.map((event) => {
                        return (event.longitude && event.latitude && mapRef.current && <Marker
                            key={event.id}
                            id={event.id}
                            map={mapRef.current}
                            long={event.longitude}
                            lati={event.latitude}
                            category={event.categories[0]}
                            isActive={event.id == selectedEventId}  
                            onClick={(id: number) => {setSelectedEventId(id); setInfoOpen(true);}}                              
                        />)
                    })}

                    {!listOpen && <div className="floatingSearchBar"><SearchBar search={filters.search} setSearch={(new_search: string) => setFilters({...filters, search: new_search})} items={filteredEventIds} setItems={setFilteredEventIds} onSearch={()=>{setListOpen(true);}}/><FilterRow filters={filters} setFilters={setFilters}/></div>}
                    {(listOpen || infoOpen) && <div className="container-row mapSideBar" style={{flex: 0}}>
                        {listOpen && <div className="eventsSideBar events">
                            <div className="searchAndFilters">
                                <SearchBar search={filters.search} setSearch={(new_search: string) => setFilters({...filters, search: new_search})} items={filteredEventIds} setItems={setFilteredEventIds} onClose={() => setListOpen(false)}/>
                                <Filters filters={filters} setFilters={setFilters}/>   
                            </div>
                            <div className="events eventsSmall">
                                {events.map((event) => (<EventModuleSmall onClick={() => {setSelectedEventId(event.id); setInfoOpen(true); event.longitude && event.latitude && mapRef.current?.getBounds() && !mapRef.current.getBounds()?.contains(new mapboxgl.LngLat(event.longitude, event.latitude)) && setLocation([event.longitude, event.latitude])}} eventTitle={event.title} eventDescription={event.description} />))}
                            </div>
                        </div>}
                        {infoOpen && <div className="eventsSideBar">
                            <div className="row justify-end"><img className="close-icon"src={closeIcon} alt="Close" onClick={() =>{setInfoOpen(false);}} /></div>
                            {selectedEventId && events.find((e) => e.id === selectedEventId) && 
                                <EventInfoModule event={events.find((e) => e.id === selectedEventId)!} />
                            }
                        </div>}
                    </div>}
                </div>
            </div>
        </>
}
export default MapPage;