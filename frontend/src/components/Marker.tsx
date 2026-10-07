import { useEffect, useRef } from "react"
import mapboxgl from 'mapbox-gl'
import { createPortal } from "react-dom"

type props = {
    map: mapboxgl.Map,
    id: number, //id of the event element
    long: number,
    lati: number,
    category: string,
    isActive?: boolean,
    onClick?: Function
}
const Marker = ({ map, id, long, lati, category, isActive, onClick }: props) => {

    const markerRef = useRef<mapboxgl.Marker | null>(null)
    const contentRef = useRef(document.createElement("div"));
    useEffect(() => {
        markerRef.current = new mapboxgl.Marker(contentRef.current)
            .setLngLat([long, lati])
            .addTo(map)

        return () => {
             markerRef.current?.remove()
        }
    }, [])
    return (<>
        {createPortal(
            <div className={isActive? "eventMarker active": "eventMarker"} onClick={onClick?()=>{onClick(id)}: ()=>{}}>
                #{category}
            </div>, contentRef.current
        )}
    </>)
}

export default Marker