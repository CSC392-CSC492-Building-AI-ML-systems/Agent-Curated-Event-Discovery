import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

type props = {
  map: mapboxgl.Map;
  id: number; //id of the event element
  long: number;
  lati: number;
  isActive?: boolean;
  onClick?: (id: number) => void;
};
export default function Marker ({ map, id, long, lati, isActive, onClick }: props) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    markerRef.current = new mapboxgl.Marker()
      .setLngLat([long, lati])
      .addTo(map);
    markerRef.current.getElement().addEventListener("click", () => {
      onClick ? onClick(id) : () => {};
    });
    
    const svg = markerRef.current.getElement().querySelector("svg");
    if (svg) {
      svg.style.transition = "width 0.3s ease, height 0.3s ease";
    }
    return () => {
      markerRef.current?.remove();
    };
  }, []);
  useEffect(() => {
    const svg = markerRef.current?.getElement().querySelector("svg");
    if (!svg) return;
    svg.style.width = isActive ? "50px" : "40px";
    svg.style.height = isActive ? "50px" : "40px";
  }, [isActive]);
  return <></>;
};

