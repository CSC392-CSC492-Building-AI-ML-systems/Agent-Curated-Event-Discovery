import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import TagLink from "../components/TagLink";
import { Header } from "../components/NavBar";
import SearchBar from "../components/SearchBar";
import DiscoverEventCard from "../components/DiscoverEventCard";
import EventDetails from "../components/EventDetails";
import EventRequestState from "../components/EventRequestState";
import ForYouSection from "../components/ForYouSection";
import type { EventideEvent, EventPageProps } from "../interfaces/interfaces";
import "./DiscoverPage.css";
import filterEvents from "../utils/filterEvents";
import TagFilters from "../components/TagFilters";
import { useSearchTracking } from "../hooks/useSearchTracking";
import { INITIAL_FILTERS, MAX_PRICE, MIN_PRICE } from "../interfaces/constants";

const handlePosition = (value: number) => {
  const pct = (value - MIN_PRICE) / (MAX_PRICE - MIN_PRICE);
  return `calc(${pct * 100}% + ${(0.5 - pct) * 18}px)`;
};

export default function DiscoverPage({
  events,
  saved,
  onSave,
  liked, 
  onLike,
  followed,
  browse,
  setBrowse,
  loading,
  error,
  retry,
}: EventPageProps) {
  
  const { search, range, sort, tags } = browse;
  const location = useLocation();
  const [tempMin, setTempMin] = useState(MIN_PRICE)
  const [tempMax, setTempMax] = useState(MAX_PRICE)
  const [selected, setSelected] = useState<EventideEvent | null>(null);
  const [now] = useState(() => Date.now());
  const { track } = useSearchTracking(search);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, location.state?.returnScroll || 0),
    );

    return () => cancelAnimationFrame(frame);
  }, [location.key, location.state]);

  const allTags = [
    ...new Map(
      events.flatMap((event) => event.tags).map((tag) => [tag.id, tag]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const query = search.trim().toLowerCase();

  const visible = filterEvents(events, browse, now);

  const renderCard = (event: EventideEvent, compact = false) => (
    <DiscoverEventCard
      key={event.id}
      event={event}
      compact={compact}
      saved={saved.includes(event.id)}
      onSave={onSave}
      liked={liked.includes(event.id)}
      onLike={onLike}
      onOpen={setSelected}
    />
  );

  return (
    <div className="discover-page">
      <div className="discover-wrap">
        <Header savedCount={saved.length} />
        <main className="column small-gap">
          <SearchBar
            search={search}
            setSearch={(search: string) => setBrowse({ ...browse, search })}
            onSearch={() => track(search)}
            placeholder="Search events, topics, places"
          />
          <div className="discover-toolbar">
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
                onChange={(e) => setBrowse({ ...browse, sort: e.target.value })}
              >
                <option value="upcoming">Upcoming</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
            <label>
              Price
              <div className="column small-gap" style={{width: "120px"}}>
                <div style={{display: "block"}}>
                  <div className="discover-page-slider-progress">
                    <div className="coloured-progress" style={{ left: `${((tempMin - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`, right: `${100 - ((tempMax - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%` }}></div>
                  </div>
                  <div className="discover-page-slider-range">
                    <span className="slider-price-label" style={{ left: handlePosition(tempMin) }}>
                      ${tempMin}
                    </span>
                    <span className="slider-price-label" style={{ left: handlePosition(tempMax) }}>
                      ${tempMax}
                    </span>
                    <input type="range" id="minPrice" min={MIN_PRICE} max={MAX_PRICE} list="tickmarks" value={tempMin} onChange={(event) => {if (Number(event.target.value) <= tempMax - 10) setTempMin(Number(event.target.value))}} onPointerUp={() => setBrowse({ ...browse, price: [tempMin, browse.price[1]] })} onKeyUp={() => setBrowse({ ...browse, price: [tempMin, browse.price[1]] })}/>
                    <input type="range" id="maxPrice" min={MIN_PRICE} max={MAX_PRICE} list="tickmarks" value={tempMax} onChange={(event) => {if (Number(event.target.value) >= tempMin + 10) setTempMax(Number(event.target.value))}} onPointerUp={() => setBrowse({ ...browse, price: [browse.price[0], tempMax] })} onKeyUp={() => setBrowse({ ...browse, price: [browse.price[0], tempMax] })}/>
                  </div>
                </div>
              </div>
            </label>
            <label>
              Allow 18+
              <label className="switch">
                <input type="checkbox" onChange={(e)=>{setBrowse({...browse, eighteenPlus: e.target.checked})}}/>
                <span className="slider round"></span>
              </label>
            </label>

            <div className="discover-view">
              <span className={"pill active"} aria-current="page">
                List
              </span>
              <Link className="pill" to="/map">
                Map
              </Link>
            </div>
          </div>
          <div
            className="discover-topics"
            role="group"
            aria-label="Filter by topic"
          >
            <TagFilters
              allTags={allTags}
              selectedTags={tags}
              setBrowse={setBrowse}
            />
          </div>

          <ForYouSection liked={liked} onLike={onLike} saved={saved} onSave={onSave} />  {/*Need to display the star and its current state*/}

          <EventRequestState loading={loading} error={error} retry={retry} />

          {!loading && !error && (
            <>
              <section aria-labelledby="discover-upcoming">
                <div className="discover-section-heading">
                  <h2 id="discover-upcoming">
                    {query
                      ? `Results for “${search.trim()}”`
                      : range === "all-dates"
                        ? "All events"
                        : "Upcoming"}
                  </h2>

                  <span role="status">
                    {visible.length} {visible.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {visible.length > 0 ? (
                  <div className="discover-list">
                    {visible.map((event) => renderCard(event))}
                  </div>
                ) : (
                  <div className="discover-empty">
                    <h3>
                      {events.length
                        ? "No events match"
                        : "No events available"}
                    </h3>

                    <p>
                      {events.length
                        ? "Try a wider date range, a different search, or fewer topics."
                        : "There are no events to display yet."}
                    </p>

                    <button
                      className="pill"
                      onClick={() => {
                        setBrowse(INITIAL_FILTERS);
                      }}
                    >
                      Browse all events
                    </button>
                  </div>
                )}
              </section>

              {!query && (
                <section aria-labelledby="discover-following">
                  <h2 id="discover-following">
                    Following{" "}
                    <span className="discover-tags">
                      {followed.map((tag) => (
                        <TagLink key={tag.id} tag={tag} />
                      ))}
                    </span>
                  </h2>
                  {followed.length ? (
                    followed.map((tag) => {
                      const matches = visible.filter((event) =>
                        event.tags.some((eventTag) => eventTag.id == tag.id),
                      );

                      return (
                        matches.length > 0 && (
                          <div key={tag.name}>
                            <h3 className="discover-topic-heading">
                              <TagLink tag={tag} />
                            </h3>
                            <div className="discover-grid">
                              {matches
                                .slice(0, 3)
                                .map((event) => renderCard(event, true))}
                            </div>
                          </div>
                        )
                      );
                    })
                  ) : (
                    <p className="discover-empty">
                      Open a tag on an event and follow it to see its events
                      here.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </main>
        {selected && (
          <EventDetails
            event={selected}
            saved={saved.includes(selected.id)}
            onSave={onSave}
            liked={liked.includes(selected.id)}
            onLike={onLike}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
