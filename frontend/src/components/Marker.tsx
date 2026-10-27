import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

type props = {
  map: mapboxgl.Map;
  long: number;
  lati: number;
  isActive?: boolean;
  onClick?: () => void;
  element?: HTMLElement;
};
export default function Marker ({ map, long, lati, isActive, onClick, element }: props) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    markerRef.current = new mapboxgl.Marker({element: element})
      .setLngLat([long, lati])
      .addTo(map);
    markerRef.current.getElement().addEventListener("click", () => {
      onClick ? onClick() : () => {};
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

