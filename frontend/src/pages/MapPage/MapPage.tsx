import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/NavBar";
import SearchBar from "../../components/SearchBar";
import Marker from "../../components/Marker";
import type { EventideEvent, EventPageProps } from "../../interfaces/interfaces";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import closeIcon from "../../assets/images/close-icon.svg";
import mapMarkerIcon from '../../assets/images/map-marker.svg';
import DiscoverEventCard from "../../components/DiscoverEventCard";
import EventDetails from "../../components/EventDetails";
import EventRequestState from "../../components/EventRequestState";
import filterEvents from "../../utils/filterEvents";
import searchIcon from "../../assets/images/search-icon.svg";
import targetIcon from "../../assets/images/target-icon.svg";
import backIcon from "../../assets/images/back-icon.svg";
import "./MapPage.css";

type MapCenter = [longitude: number, latitude: number];

const DEFAULT_LOCATION: MapCenter = [-79.34, 43.64];

const eventInBounds = (event: EventideEvent, mapRef: React.RefObject<mapboxgl.Map | null>, infoOpen: boolean, listOpen: boolean): boolean => {
  if (!mapRef || !(mapRef.current)) return false;
  if (!event.longitude || !event.latitude) return true;
  const {x, y} = mapRef.current?.project(new mapboxgl.LngLat(
    event.longitude,
    event.latitude,
  ))?? {x: null, y: null};
  const {clientWidth, clientHeight} = mapRef.current.getCanvas();
  if (!x || !y) return true;
  return x >= 0 && x<=(clientWidth - (infoOpen? 376: 0) - (listOpen? 376: 0)) && y >= 0 && y <= clientHeight;
}
function MapPage({
  events,
  saved,
  onSave,
  followed,
  loading,
  error,
  retry,
  browse,
  setBrowse,
}: EventPageProps) {
  //data states
  const allTags = [
    ...new Map(
      events.flatMap((event) => event.tags).map((tag) => [tag.id, tag]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const [now] = useState(() => Date.now());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<number[] | null>(null);
  const { search, range, sort, tags } = browse;
  const [visible, setVisible] = useState(events);
  
  //UI states
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const infoMenu = useRef<HTMLDivElement | null>(null); //events details
  const listMenu = useRef<HTMLDivElement | null>(null); //events list

  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation]  = useState<MapCenter | null>(null); //this is the user's actual location from their browser data
  const [listOpen, setListOpen] = useState<boolean>(true);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);
  console.log(`visible:${JSON.stringify(visible)}`)

  const userLocationElement = document.createElement('div');
    const markerInner = document.createElement('div');
    markerInner.className = 'pulsating-circle';
    userLocationElement.appendChild(markerInner);
  const selectedEvent =
    selectedEventId === null
      ? undefined
      : events.find((event) => event.id === selectedEventId);
  const selectedEvents = []
  if (selectedEventIds){
    for (let event of events){
      if (selectedEventIds.includes(event.id)){
        selectedEvents.push(event)
      }
    }   
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = [position.coords.longitude, position.coords.latitude] as MapCenter;
        setUserLocation(pos);
        mapRef.current?.easeTo({center: pos, duration: 500,  padding: {right: (infoOpen? 376: 0) + (listOpen? 376: 0)}});
      },
      (error) => {
        console.warn("Unable to get the user's location:", error.message);
      },
    );
  };

  const closeEventDetails = () => {
    setInfoOpen(false);
    setSelectedEventId(null);
  };

  useEffect(() => {
    //create map
    if (!mapContainerRef.current) return;
    const map = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      container: mapContainerRef.current,
      center: DEFAULT_LOCATION,
      zoom: 10.12,
      fadeDuration: 0,
      touchPitch: false
    });
    mapRef.current = map;
    const handleLoad = () => {
      map.keyboard.disablePitch();
      map.dragRotate.disablePitch();
      if (!map.hasImage("marker")){
        const mapMarker = new Image(50, 50);
        mapMarker.onload = ()=>{
          map.addImage("marker", mapMarker, { pixelRatio: 2 });
        }
        mapMarker.src = mapMarkerIcon;
      }
      map.addSource('events', {
          type: 'geojson',
          generateId: true,
          cluster: true,
          clusterMaxZoom: 14, 
          clusterRadius: 50,
          clusterProperties: {"total_count": ["+", ["get", "count"]]},
          data: {
            "type": "FeatureCollection",
            "crs": {
              "type": "name",
              "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
              }
            },
            "features": []
          }
      });

      map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'events',
          filter: ['has', 'point_count'],
          paint: {
              // Use step expressions (https://docs.mapbox.com/style-spec/reference/expressions/#step)
              // with three steps to implement three types of circles:
              // 20px circles when point count is less than 100, 30px circles when point count is between 100 and 750, 40px circles when point count is greater than or equal to 750
              'circle-color': '#f6545c',
              'circle-radius': [
                  'step',
                  ['get', 'total_count'],
                  20,
                  100,
                  30,
                  750,
                  40
              ],
          }
      });

      map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'events',
          filter: ['has', 'point_count'],
          layout: {
              'text-field': ['get', 'total_count'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 20
          },
          paint: {
            'text-color': 'white'
          }
      });

      map.addLayer({
          id: 'unclustered-multi-circle',
          type: 'circle',
          source: 'events',
          filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
          paint: {
            'circle-color': '#f6545c',
            'circle-radius': 20,
          }
      });

      map.addLayer({
          id: 'unclustered-multi-count',
          type: 'symbol',
          source: 'events',
          filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "count"], 1]],
          layout: {
              'text-field': ['get', 'count'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 20
          },
          paint: {
            'text-color': 'white'
          }
      });

      map.addLayer({
          id: 'unclustered-point',
          type: 'symbol',
          source: 'events',
          filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "count"], 1]],
          layout: {
            "icon-image": "marker",
            "icon-size": 1.5,
            "icon-allow-overlap": true,
          },
      });
      
      // When a click event occurs on a cluster,
      // getClusterExpansionZoom grabs the zoomlevel where the cluster expands
      // Then the viewport zooms in to show the expanded cluster
      // Displaying the underlying individual points and/or smaller clusters
      map.addInteraction('click-clusters', {
        type: 'click',
        target: { layerId: 'clusters' },
        handler: (e) => {  
          let willOpen = false;      
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });         
          const clusterId = features[0].properties?.cluster_id;
          const events = map.getSource('events') as mapboxgl.GeoJSONSource | undefined
          events?.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom?? undefined,
              padding: {right: (willOpen? 376: 0) + (infoOpen? 376: 0)}
            });
          });          
        }
      });
      
      //upon clicking on unclustered point count (pin representing a [lng, lat] with more than one event), open side menu
      //and print out info about all events occurring there
      map.addInteraction('click-unclustered-multi', {
        type: 'click',
        target: { layerId: 'unclustered-multi-circle' },
        handler: (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-multi-circle']
          });
          const ids = features[0].properties.ids;
          let eventIds: number[] = JSON.parse(ids);
          setSelectedEventIds(eventIds);
          setSelectedEventId(null);
          setInfoOpen(false);
          setListOpen(true);            
          map.easeTo({
            center: features[0].geometry.coordinates,
            padding: {right: (infoOpen? 376: 0) + 376}
          });
        }
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup on sidebar
      // with its event info
      map.addInteraction('click-unclustered-point', {
        type: 'click',
        target: { layerId: 'unclustered-point' },
        handler: (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-point']
          });
          map.easeTo({
            center: features[0].geometry.coordinates,
            padding: {right: (infoOpen? 376: 0) + (listOpen? 376: 0)}
          });
          setSelectedEventId(features[0].properties.id);
          setSelectedEventIds([]);
          setInfoOpen(true);
        }
      });

      // Change the cursor to a pointer when the mouse is over a cluster of POIs.
      map.addInteraction('clustered-mouseenter', {
        type: 'mouseenter',
        target: { layerId: 'clusters' },
        handler: () => {
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      // Change the cursor back to a pointer when it stops hovering over a cluster of POIs.
      map.addInteraction('clustered-mouseleave', {
        type: 'mouseleave',
        target: { layerId: 'clusters' },
        handler: () => {
          map.getCanvas().style.cursor = '';
        }
      });

      // Change the cursor to a pointer when the mouse is over an individual POI.
      map.addInteraction('unclustered-mouseenter', {
        type: 'mouseenter',
        target: { layerId: 'unclustered-point' },
        handler: () => {
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      // Change the cursor back to a pointer when it stops hovering over an individual POI.
      map.addInteraction('unclustered-mouseleave', {
        type: 'mouseleave',
        target: { layerId: 'unclustered-point' },
        handler: () => {
          map.getCanvas().style.cursor = '';
        }
      });
      setMapReady(true);
    };
    map.on("load", handleLoad);
    
    return () => {
      map.off("load", handleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(()=>{
    setVisible(filterEvents(events, browse, now));
  }, [events, browse, now])
  useEffect(()=>{
    //since visible changed, change the source on map
    const source = mapRef.current?.getSource('events') as mapboxgl.GeoJSONSource | undefined;
    const eventCount = new Map();
    const eventInfo = new Map();
    const features = [];
    for (const event of visible) {
      console.log( `event: ${JSON.stringify(event)}`)
      const coorsStr = JSON.stringify([event.longitude, event.latitude]);
      console.log( `coors: ${coorsStr}`)
      if (!eventCount.has(coorsStr)){
        console.log( `eventCount does not have coors`)
        eventCount.set(coorsStr, 1);
        eventInfo.set(coorsStr, [event]);
      }else{
        console.log( `eventCount has coors`)
        const count = eventCount.get(coorsStr);
        eventCount.set(coorsStr, count+1);
        eventInfo.get(coorsStr).push(event);
      }
    }
    console.log(`eventCount: ${JSON.stringify(eventCount)}`)
    for (const [coorsStr, count] of eventCount){
      const events = eventInfo.get(coorsStr);
      const coors = JSON.parse(coorsStr);
      if (count > 1){
        features.push(
          {"type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [coors[0], coors[1]]
            },
            "properties": {
              "count": count,
              "ids": JSON.stringify(events.map((event: EventideEvent) => event.id))
            }
          }
        )
      }else{
        features.push(
          {"type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [coors[0], coors[1]]
            },
            "properties": {
              "count": count,
              "key": events[0].id,
              "id": events[0].id,
              "title": events[0].title,
              "tag": events[0].tags[0]
            }
          }
        )
      }
    }
    console.log(`features: ${JSON.stringify(features)}`)
    source?.setData({
      "type": "FeatureCollection",
      "crs": {
        "type": "name",
        "properties": {
          "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
      },
      "features": features
    })
  }, [mapReady, visible])
  return (
    <div
      className="map-page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
      }}
    >
      <div
        style={{
          padding: "20px",
        }}
      >
        <Header savedCount={saved.length} />
      </div>
      <div className="map">
        <div ref={mapContainerRef} className="mapContainer" />
          {userLocation && mapRef.current && <Marker element={userLocationElement} key="userLocation" map={mapRef.current} long={userLocation[0]} lati={userLocation[1]} />}
        <div className="mapSideBarContainer">
          <div className="column floatingButtonContainer small-gap">
            {!listOpen && <div className="floatingButton">
              <button type="submit" className="searchBarButton" aria-label="Search" onClick={()=>{setListOpen(true)}}>
                <img className="icon" src={searchIcon} alt="" />
              </button>              
            </div>}
            { userLocation && //for re-centering user location
            <div className="floatingButton"> 
              <button type="submit" className="userTargetButton" aria-label="Recenter" onClick={()=>{mapRef.current?.easeTo({center: userLocation, duration: 500, padding: {right: (infoOpen? 376: 0) + (listOpen? 376: 0)}}); console.log(`set user location: ${JSON.stringify(userLocation)}`)}}>
                <img className="icon" src={targetIcon} alt="" />
              </button>              
            </div>}
          </div>
        
          <div className="container-row mapSideBar" style={{ flex: 0 }}>
            <div ref={infoMenu} className={`eventsSideBarContainer ${infoOpen? "open": ""}`}>
              <div className="eventsSideBar">
                <div className="row justify-end">
                  <img
                    className="close-icon"
                    src={closeIcon}
                    alt="Close"
                    onClick={closeEventDetails}
                  />
                </div>
                <div className="eventsSideBarScroll">
                  {selectedEvent && (
                    <EventDetails
                      style={{ margin: 0, padding: 0, border: "none", background: "none", borderRadius: 0}}
                      popup={false}
                      event={selectedEvent}
                      saved={saved.includes(selectedEvent.id)}
                      onSave={onSave}
                      onClose={closeEventDetails}
                    />
                  )}
                </div>                
              </div>
            </div>
            <div ref={listMenu} className={`eventsSideBarContainer ${listOpen? "open": ""}`}>
              <div className="eventsSideBar events">
                <div className="eventsSideBarScroll">
                  <div className="searchAndFilters column small-gap">
                    <div className="discover-view">
                      <Link className="pill" aria-current="page" to="/">
                        List
                      </Link>
                      <span className="pill active">Map</span>
                    </div>
                    <SearchBar
                      clearSearch={false}
                      search={search}
                      setSearch={(search) =>
                        setBrowse((previous) => ({ ...previous, search }))
                      }
                      onClose={() => setListOpen(false)}
                    />
                    <div className="map-toolbar column align-start">
                      <label>
                        Dates{" "}
                        <select
                          value={range}
                          onChange={(e) =>
                            setBrowse((previous) => ({
                              ...previous,
                              range: e.target.value,
                            }))
                          }
                        >
                          <option value="7">Next 7 days</option>
                          <option value="30">Next 30 days</option>
                          <option value="all">All upcoming</option>
                          <option value="all-dates">All dates</option>
                        </select>
                      </label>
                      <label>
                        Sort by{" "}
                        <select
                          value={sort}
                          onChange={(e) =>
                            setBrowse((previous) => ({
                              ...previous,
                              sort: e.target.value,
                            }))
                          }
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="title">Title A–Z</option>
                        </select>
                      </label>
                      <div
                        className="map-topics"
                        role="group"
                        aria-label="Filter by topic"
                      >
                        <span>Include</span>
                        {allTags.map((tag) => (
                          <button
                            key={tag.id}
                            className={`map-chip chip ${tags.some((selectedTag) => selectedTag.id === tag.id) ? "active" : ""}`}
                            aria-pressed={tags.some(
                              (selectedTag) => selectedTag.id === tag.id,
                            )}
                            onClick={() =>
                              setBrowse((previous) => ({
                                ...previous,
                                tags: browse.tags.some(
                                  (selectedTag) => selectedTag.id === tag.id,
                                )
                                  ? browse.tags.filter(
                                      (selectedTag) =>
                                        selectedTag.id !== tag.id,
                                    )
                                  : [...browse.tags, tag],
                              }))
                            }
                          >
                            #{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="list">
                    <EventRequestState
                      loading={loading}
                      error={error}
                      retry={retry}
                    ></EventRequestState>
                    {!loading &&
                      !error &&
                      visible.map((event) => (
                        <DiscoverEventCard
                          key={event.id}
                          event={event}
                          compact={true}
                          saved={saved.includes(event.id)}
                          onSave={onSave}
                          onOpen={(eventideEvent) => {
                            setSelectedEventId(eventideEvent.id);
                            setInfoOpen(true);
                            event.longitude != null &&
                              event.latitude != null &&
                              !eventInBounds(event, mapRef, infoOpen, listOpen)&&
                              mapRef.current?.easeTo({center: [event.longitude, event.latitude], duration: 500, padding: {right: (infoOpen? 376: 0) + (listOpen? 376: 0)}});
                          }}
                        />
                      ))}
                  </div>
                </div>
                 
                 <div className={`selectedEventsSideBar ${selectedEvents.length>1? "open": ""}`}>
                  <div className="eventsSideBarScroll small-gap column" style={{height: "100%"}}>
                    <img
                      className="back-icon"
                      src={backIcon}
                      alt="Back"
                      onClick={()=>{setSelectedEventIds([])}}
                      width="40px"
                      height="40px"
                    />
                    {selectedEvents.map((event) => (
                      <DiscoverEventCard
                        key={event.id}
                        event={event}
                        compact={true}
                        saved={saved.includes(event.id)}
                        onSave={onSave}
                        onOpen={(eventideEvent) => {
                          setSelectedEventId(eventideEvent.id);
                          setInfoOpen(true);
                          event.longitude != null &&
                            event.latitude != null &&
                            !eventInBounds(event, mapRef, infoOpen, listOpen)&&
                            mapRef.current?.easeTo({center: [event.longitude, event.latitude], duration: 500, padding: {right: (infoOpen? 376: 0) + (listOpen? 376: 0)}});
                        }}
                      />))
                      }
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default MapPage;
