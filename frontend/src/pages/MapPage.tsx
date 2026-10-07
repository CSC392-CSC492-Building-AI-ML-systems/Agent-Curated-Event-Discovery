import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import type { EventideEvent } from "../interfaces/interfaces";

function MapPage(){
    const [events, setEvents] = useState<EventideEvent[]>([]);
      useEffect(() => {
          //all the initial fetches would go here
          setEvents([{ key: 1, id: 1, title: "Event 1", description: "This is the first event." }]);
        }, []
      )
    return <>
        <NavBar/>
        <h1>
            Map Page
        </h1>
    </>
}
export default MapPage;