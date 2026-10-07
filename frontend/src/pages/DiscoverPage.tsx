import NavBar from '../components/NavBar';
import EventModule from '../components/EventModules';
import type { EventideEvent } from '../interfaces/interfaces';
import {useEffect, useState} from 'react';
function DiscoverPage() {
    const [events, setEvents] = useState<EventideEvent[]>([]);
    useEffect(() => {
        //all the initial fetches would go here
        setEvents([{ key: 1, id: 1, title: "Event 1", description: "This is the first event.", categories: ['tech'] }]);
      }, []
    )
    return <div>
        <NavBar/>
        <h1>
          Event scanner
        </h1>
        <div className="events">
          {events.map((event) => (<EventModule eventTitle={event.title} eventDescription={event.description} />))}
        </div>
      </div>
}

export default DiscoverPage;