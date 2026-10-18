import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/NavBar";
import SearchBar from "../components/SearchBar";
import Marker from "../components/Marker";
import type { EventPageProps } from "../interfaces/interfaces";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import closeIcon from "../assets/images/close-icon.svg";
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import { eventDayKey } from "../utils/calendar";
import EventRequestState from "../components/EventRequestState";

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

  const query = search.trim().toLowerCase();

  const visible = events
    .filter((event) => {
      const date = event.startDate ? new Date(event.startDate).getTime() : null;
      const isTodayWithoutTime =
        event.startTimeKnown === false &&
        event.startDate &&
        eventDayKey(event.startDate) ===
          eventDayKey(new Date(now).toISOString());

      const matchesDate =
        range === "all-dates" ||
        date === null ||
        (date >= now &&
          (range === "all" || date <= now + Number(range) * 86_400_000)) ||
        isTodayWithoutTime;

      const searchableText = [
        event.title,
        event.description,
        event.venue.address,
        event.venue.name,
        event.organizer?.name,
        ...event.tags.map((tag) => tag.name),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesTags =
        tags.length === 0 ||
        event.tags.some((tag) =>
          tags.some((selectedTag) => selectedTag.id === tag.id),
        );

      return matchesDate && matchesSearch && matchesTags;
    })
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (Date.parse(a.startDate || "") || 0) -
          (Date.parse(b.startDate || "") || 0),
    );

  //UI states
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [location, setLocation] = useState<MapCenter>(DEFAULT_LOCATION);

  const [listOpen, setListOpen] = useState<boolean>(true);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);

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
        setLocation([position.coords.longitude, position.coords.latitude]);
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
    });
    mapRef.current = map;
    const handleLoad = () => {
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

  useEffect(() => {
    mapRef.current?.setCenter(location);
  }, [location]);

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
        {mapReady &&
          visible.map(
            (event) =>
              event.longitude != null &&
              event.latitude != null && (
                <Marker
                  key={event.id}
                  id={event.id}
                  map={mapRef.current!}
                  long={event.longitude}
                  lati={event.latitude}
                  isActive={event.id === selectedEventId}
                  onClick={(id: number) => {
                    setSelectedEventId(id);
                    setInfoOpen(true);
                  }}
                />
              ),
          )}

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
                    style={{ padding: 0, border: "none" }}
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
                      setSearch={(search) => setBrowse((previous) => ({ ...previous, search }))}
                      onClose={() => setListOpen(false)}
                    />
                    <div className="map-toolbar column align-start">
                      <label>
                        Dates{" "}
                        <select
                          value={range}
                          onChange={(e) => setBrowse((previous) => ({ ...previous, range: e.target.value }))}
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
                          onChange={(e) => setBrowse((previous) => ({ ...previous, sort: e.target.value }))}
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
                            onClick={() => setBrowse((previous) => ({ ...previous,
                                tags: browse.tags.some(
                                  (selectedTag) => selectedTag.id === tag.id,
                                )
                                  ? browse.tags.filter(
                                      (selectedTag) =>
                                        selectedTag.id !== tag.id,
                                    )
                                  : [...browse.tags, tag],
                              })
                        )}
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
                              setLocation([event.longitude, event.latitude]);
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
