import type { EventideEvent } from "../interfaces/interfaces"

type props = {
    eventTitle: string,
    eventDescription: string,
    onClick?: Function
}

type infoProps = {
  event: EventideEvent
}
function EventModule({ eventTitle, eventDescription}: props) {
    return <div className="event">
            <img alt="Event image" />
            <div className="eventDetails">
              <h1>{eventTitle}</h1>
              <p>{eventDescription}</p>
            </div>
          </div>
}

export function EventModuleSmall({ eventTitle, eventDescription, onClick}: props) {
    return <div className="event" onClick={onClick?()=>{onClick()}: ()=>{}}>
            <img alt="Event image" />
            <div className="eventDetailsSmall">
              <h1>{eventTitle}</h1>
              <p>{eventDescription}</p>
            </div>
          </div>
}

export function EventInfoModule({ event }: infoProps) {
    return <div className="container">
            <img alt="Event image" />
            <h1>{event.title}</h1>
            <div className="row">{event.categories.map((category) => <span key={category} className="tag">#{category}</span>)}</div>
            <p>{event.description}</p>
          </div>
}

export default EventModule;