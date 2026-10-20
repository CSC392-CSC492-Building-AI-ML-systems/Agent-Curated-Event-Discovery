import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/NavBar";
import SearchBar from "../components/SearchBar";
import type { EventPageProps } from "../interfaces/interfaces";
import mapboxgl, { type GeoJSONFeature } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import closeIcon from "../assets/images/close-icon.svg";
import mapMarkerIcon from '../assets/images/map-marker.svg';
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import EventRequestState from "../components/EventRequestState";
import filterEvents from "../utils/filterEvents";
import searchIcon from "../assets/images/search-icon.svg";
import targetIcon from "../assets/images/target-icon.svg";

type MapCenter = [longitude: number, latitude: number];

const DEFAULT_LOCATION: MapCenter = [-79.34, 43.64];

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
  const { search, range, sort, tags } = browse;
  const [visible, setVisible] = useState(events);
  
  //UI states
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation]  = useState<MapCenter | null>(null); //this is the user's actual location from their browser data
  const [listOpen, setListOpen] = useState<boolean>(true);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);
  console.log(`visible:${JSON.stringify(visible)}`)
  const selectedEvent =
    selectedEventId === null
      ? undefined
      : events.find((event) => event.id === selectedEventId);

  const getLocation = () => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = [position.coords.longitude, position.coords.latitude] as MapCenter;
        setUserLocation(pos);
        mapRef.current?.setCenter(pos);
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
    });
    mapRef.current = map;
    const handleLoad = () => {
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
                  ['get', 'point_count'],
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
              'text-field': ['get', 'point_count_abbreviated'],
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
          filter: ['!', ['has', 'point_count']],
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
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          const clusterId = features[0].properties?.cluster_id;
          const events = map.getSource('events') as mapboxgl.GeoJSONSource | undefined
          events?.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom?? undefined
              });
            });
        }
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup at
      // the location of the feature, with
      // description HTML from its properties.
      map.addInteraction('click-unclustered', {
        type: 'click',
        target: { layerId: 'unclustered-point' },
        handler: (e) => {
          const coordinates = e.feature?.geometry.coordinates.slice();
          const title = e.feature?.properties.title;
          const tag = e.feature?.properties.tag;

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`${title}`)
            .addTo(map);
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
    source?.setData({
              "type": "FeatureCollection",
              "crs": {
                "type": "name",
                "properties": {
                  "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
              },
              "features": visible.map((event)=>                
                ({"type": "Feature",
                  "geometry": {
                      "type": "Point",
                      "coordinates": [event.longitude, event.latitude]
                  },
                  "properties": {
                    "key": event.id,
                    "id": event.id,
                    "title": event.title,
                    "tag": event.tags[0]
                  }
                })
              )
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
          <div className="column floatingButtonContainer small-gap">
            {!listOpen && <div className="floatingButton">
              <button type="submit" className="searchBarButton" aria-label="Search" onClick={()=>{setListOpen(true)}}>
                <img className="icon" src={searchIcon} alt="" />
              </button>              
            </div>}
            { userLocation && //for re-centering user location
            <div className="floatingButton"> 
              <button type="submit" className="userTargetButton" aria-label="Recenter" onClick={()=>{mapRef.current?.setCenter(userLocation); console.log(`set user location: ${JSON.stringify(userLocation)}`)}}>
                <img className="icon" src={targetIcon} alt="" />
              </button>              
            </div>}
        </div>
        {(listOpen || infoOpen) && (
          <div className="container-row mapSideBar" style={{ flex: 0 }}>
            {infoOpen && (
              <div className="eventsSideBar">
                <div className="row justify-end">
                  <img
                    className="close-icon"
                    src={closeIcon}
                    alt="Close"
                    onClick={closeEventDetails}
                  />
                </div>
                {selectedEvent && (
                  <EventDetails
                    style={{ padding: 0, border: "none", overflowY: "auto", background: "none", borderRadius: 0}}
                    popup={false}
                    event={selectedEvent}
                    saved={saved.includes(selectedEvent.id)}
                    onSave={onSave}
                    onClose={closeEventDetails}
                  />
                )}
              </div>
            )}
            {listOpen && (
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
                              mapRef.current?.getBounds() &&
                              !mapRef.current
                                .getBounds()
                                ?.contains(
                                  new mapboxgl.LngLat(
                                    event.longitude,
                                    event.latitude,
                                  ),
                                ) &&
                              mapRef.current?.setCenter([event.longitude, event.latitude]);
                          }}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default MapPage;
