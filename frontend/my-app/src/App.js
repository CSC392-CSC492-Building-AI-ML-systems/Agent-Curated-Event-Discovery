import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("http://localhost:8000/events");

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="container">Loading events...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <h1>Events</h1>
        <p className="error">Failed to load events: {error}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Events</h1>

      {events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div className="event-card" key={event.id}>
              <h2>{event.name}</h2>

              {event.description && (
                <p className="description">{event.description}</p>
              )}

              <div className="event-info">
                {event.startDate && (
                  <p>
                    <strong>Starts:</strong> {formatDate(event.startDate)}
                  </p>
                )}

                {event.endDate && (
                  <p>
                    <strong>Ends:</strong> {formatDate(event.endDate)}
                  </p>
                )}

                {event.locationName && (
                  <p>
                    <strong>Location:</strong> {event.locationName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString();
}

export default App;
