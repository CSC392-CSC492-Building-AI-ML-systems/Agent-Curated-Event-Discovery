import NavBar from '../components/NavBar';
import EventModule from '../components/EventModule';
import type { EventideEvent } from '../interfaces/interfaces';

type props = {
    events: EventideEvent[]
}
function DiscoverPage({events}: props) {
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