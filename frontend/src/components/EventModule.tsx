type props = {
    eventTitle: string,
    eventDescription: string 
}
function EventModule({ eventTitle, eventDescription}: props) {
    return <div className="event">
            <img alt="Hero" />
            <div className="event-details">
              <h2>{eventTitle}</h2>
              <p>{eventDescription}</p>
            </div>
          </div>
}

export default EventModule;