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

export default function DiscoverPage({
  events,
  saved,
  onSave,
  followed,
  browse,
  setBrowse,
  loading,
  error,
  retry,
}: EventPageProps) {
  const { search, range, sort, tags } = browse;
  const location = useLocation();

  const [selected, setSelected] = useState<EventideEvent | null>(null);
  const [now] = useState(() => Date.now());

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
      onOpen={setSelected}
    />
  );

  return (
    <div className="discover-page">
      <div className="discover-wrap">
        <Header savedCount={saved.length} />
        <main>
          <SearchBar
            search={search}
            setSearch={(search: string) => setBrowse({ ...browse, search })}
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
            <span>Include</span>
            {allTags.map((tag) => (
              <button
                key={tag.name}
                className={`discover-chip ${tags.includes(tag) ? "active" : ""}`}
                aria-pressed={tags.includes(tag)}
                onClick={() =>
                  setBrowse({
                    ...browse,
                    tags: browse.tags.some(
                      (selectedTag) => selectedTag.id === tag.id,
                    )
                      ? browse.tags.filter(
                          (selectedTag) => selectedTag.id !== tag.id,
                        )
                      : [...browse.tags, tag],
                  })
                }
              >
                #{tag.name}
              </button>
            ))}
          </div>

          <ForYouSection saved={saved} onSave={onSave} />  {/*Need to display the star and its current state*/}

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
                        setBrowse({
                          search: "",
                          tags: [],
                          range: "all-dates",
                          sort: "upcoming",
                        });
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
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
