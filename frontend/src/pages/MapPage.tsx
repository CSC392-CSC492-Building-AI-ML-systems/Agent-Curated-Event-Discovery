import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/NavBar";
import SearchBar from "../components/SearchBar";
import Marker from "../components/Marker";
import type { EventideEvent, EventideFilters } from "../interfaces/interfaces";
import { INITIAL_FILTERS } from "../interfaces/constants";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import closeIcon from "../assets/images/close-icon.svg";
import Filters, { FilterRow } from "../components/Filters";
import type { EventRequestProps } from "../components/EventRequestState";
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import { eventDayKey } from "../utils/calendar";

const getLocation = (setLocation: Function) => {
  if (!navigator.geolocation) {
    console.log("Geolocation API not supported.");
    return;
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    console.log("Permissions API not supported, cannot get geolocation");
    return;
  }
  navigator.permissions
    .query({ name: "geolocation" })
    .then((result) => {
      if (result.state === "granted") {
        navigator.geolocation.getCurrentPosition((position) => {
          setLocation([position.coords.longitude, position.coords.latitude]);
        });
      } else if (result.state === "prompt") {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation([position.coords.longitude, position.coords.latitude]);
          },
          (err) => {
            console.error("Error prompting for geolocation: " + err.message);
          },
        );
      } else if (result.state === "denied") {
        console.log("User denied geolocation permissions.");
        alert(
          "Your location settings are off. Please turn on location, it makes our map easier to use!",
        );
      }
    })
    .catch((err) => {
      console.error("Error asking for geolocation perms:" + err);
    });
};

export type EventPageProps = EventRequestProps & {
  events: EventideEvent[];
  saved: number[];
  onSave: (id: number) => void;
  followed: string[];
  onFollow: (tag: string) => void;
};
type BrowseState = {
  search: string;
  range: string;
  sort: string;
  categories: string[];
};
type MapPageProps = EventPageProps & {
  browse: BrowseState;
  setBrowse: (state: BrowseState) => void;
};
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
}: MapPageProps) {
  //data states
  const allCategories = [
    ...new Set(events.flatMap((event) => event.categories)),
  ].sort();
  const [now] = useState(() => Date.now());
  const [location, setLocation] = useState<[number, number]>([-79.34, 43.64]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  // const [filteredEventIds, setFilteredEventIds] = useState<number[]>([])
  // const [filters, setFilters] = useState<EventideFilters>(INITIAL_FILTERS);
  //setFilters({...filters, attribute_name: new_value}); for setting specific filter
  const { search, range, sort, categories } = browse;
  const setSearch = (search: string) => setBrowse({ ...browse, search });
  const query = search.trim().toLowerCase();
  const filteredEvents = events
    .filter((event) => {
      const date = event.startDate ? new Date(event.startDate).getTime() : null;
      const isTodayWithoutTime =
        event.startTimeKnown === false &&
        event.startDate &&
        eventDayKey(event.startDate) ===
          eventDayKey(new Date(now).toISOString());
      return (
        (range === "all-dates" ||
          date === null ||
          ((date >= now || isTodayWithoutTime) &&
            (range === "all" || date <= now + Number(range) * 86400000))) &&
        (!query ||
          [event.title, event.description, event.address, ...event.categories]
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (!categories.length ||
          event.categories.some((category) => categories.includes(category)))
      );
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
  const [listOpen, setListOpen] = useState<boolean>(true);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);

  useEffect(() => {
    //all the initial fetches would go here

    //next check for location permissions
    getLocation(setLocation);

    //create map
    if (!mapContainerRef.current) return;
    mapRef.current = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      container: mapContainerRef.current,
      center: location,
      zoom: 10.12,
    });
    return () => {
      mapRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setCenter(location);
  }, location);
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
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Header savedCount={saved.length} />
        <div className="discover-view">
          <Link className="pill" aria-current="page" to="/">
            List
          </Link>
          <span className="pill active">Map</span>
        </div>
      </div>
      <div className="map">
        <div ref={mapContainerRef} className="mapContainer" />
        {mapRef.current &&
          events &&
          filteredEvents.map(
            (event) =>
              event.longitude != null &&
              event.latitude != null &&
              mapRef.current && (
                <Marker
                  key={event.id}
                  id={event.id}
                  map={mapRef.current}
                  long={event.longitude}
                  lati={event.latitude}
                  category={event.categories[0]}
                  isActive={event.id == selectedEventId}
                  onClick={(id: number) => {
                    setSelectedEventId(id);
                    setInfoOpen(true);
                  }}
                />
              ),
          )}

        {!listOpen && (
          <div className="floatingSearchBar">
            <SearchBar
              search={search}
              setSearch={(new_search: string) => setSearch(new_search)}
              onSearch={() => {
                setListOpen(true);
              }}
            />
            <div className="map-toolbar">
              <label>
                Dates{" "}
                <select
                  value={range}
                  onChange={(e) =>
                    setBrowse({ ...browse, range: e.target.value })
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
                    setBrowse({ ...browse, sort: e.target.value })
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
                {allCategories.map((category) => (
                  <button
                    key={category}
                    className={`map-chip chip ${categories.includes(category) ? "active" : ""}`}
                    aria-pressed={categories.includes(category)}
                    onClick={() =>
                      setBrowse({
                        ...browse,
                        categories: categories.includes(category)
                          ? categories.filter((value) => value !== category)
                          : [...categories, category],
                      })
                    }
                  >
                    #{category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(listOpen || infoOpen) && (
          <div className="container-row mapSideBar" style={{ flex: 0 }}>
            {listOpen && (
              <div className="eventsSideBar events">
                <div className="eventsSideBarScroll">
                  <div className="searchAndFilters column small-gap">
                    <SearchBar
                      clearSearch={false}
                      search={search}
                      setSearch={(new_search: string) => setSearch(new_search)}
                      onClose={() => setListOpen(false)}
                    />
                    <div className="map-toolbar column align-start">
                      <label>
                        Dates{" "}
                        <select
                          value={range}
                          onChange={(e) =>
                            setBrowse({ ...browse, range: e.target.value })
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
                            setBrowse({ ...browse, sort: e.target.value })
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
                        {allCategories.map((category) => (
                          <button
                            key={category}
                            className={`map-chip chip ${categories.includes(category) ? "active" : ""}`}
                            aria-pressed={categories.includes(category)}
                            onClick={() =>
                              setBrowse({
                                ...browse,
                                categories: categories.includes(category)
                                  ? categories.filter(
                                      (value) => value !== category,
                                    )
                                  : [...categories, category],
                              })
                            }
                          >
                            #{category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="list">
                    {filteredEvents.map((event) => (
                      <DiscoverEventCard
                        key={event.id}
                        event={event}
                        compact={true}
                        saved={saved.includes(event.id)}
                        onSave={onSave}
                        onOpen={(eventideEvent) => {
                          setSelectedEventId(eventideEvent.id);
                          setInfoOpen(true);
                          event.longitude &&
                            event.latitude &&
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
            {infoOpen && (
              <div className="eventsSideBar">
                <div className="row justify-end">
                  <img
                    className="close-icon"
                    src={closeIcon}
                    alt="Close"
                    onClick={() => {
                      setInfoOpen(false);
                    }}
                  />
                </div>
                {selectedEventId &&
                  events.find((e) => e.id === selectedEventId) && (
                    <EventDetails
                      style={{ padding: 0, border: "none" }}
                      popup={false}
                      event={events.find((e) => e.id === selectedEventId)!}
                      saved={saved.includes(selectedEventId)}
                      onSave={onSave}
                      onClose={() => setSelectedEventId(null)}
                    />
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default MapPage;
