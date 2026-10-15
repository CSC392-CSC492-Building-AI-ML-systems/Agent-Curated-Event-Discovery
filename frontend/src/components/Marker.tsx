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
    useEffect(() => {
        markerRef.current = new mapboxgl.Marker()
            .setLngLat([long, lati])
            .addTo(map)
        markerRef.current.getElement().addEventListener("click", () => {onClick?onClick(id):()=>{}})
        const svg = markerRef.current.getElement().querySelector("svg");
        if(svg){
            svg.style.transition = "width 0.3s ease, height 0.3s ease";
        }
        return () => {
            markerRef.current?.remove()
        }
    }, [])
    useEffect(()=>{
        const svg = markerRef.current?.getElement().querySelector("svg");
        if (!svg) return
        svg.style.width = isActive? "50px": "40px";
        svg.style.height = isActive? "50px": "40px";
    }, [isActive])
    return <></>
}

export default Marker