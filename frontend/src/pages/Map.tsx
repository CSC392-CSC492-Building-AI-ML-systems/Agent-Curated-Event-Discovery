import React, { useEffect, useRef } from 'react';
import * as mapboxgl from 'mapbox-gl/esm';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapboxExample = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          theme: 'monochrome',
          lightPreset: 'night'
        }
      },
      center: [-103.5917, 40.6699],
      zoom: 3
    });
    const onLoad = () =>{mapRef.current.addSource('earthquakes', {
        type: 'geojson',
        generateId: true,
        data: {
              "type": "FeatureCollection",
              "crs": {
                "type": "name",
                "properties": {
                  "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
              },
              "features": visible.map((event)=>                
                ({"type": "Feature",
                  "geometry": {
                      "type": "Point",
                      "coordinates": [event.latitude, event.longitude]
                  },
                  "properties": {
                    "key": event.id,
                    "id": event.id
                  }
                }))
          },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      mapRef.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'earthquakes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40
          ],
          'circle-emissive-strength': 1
        }
      });

      mapRef.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'earthquakes',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      mapRef.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'earthquakes',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
          'circle-emissive-strength': 1
        }
      });
    }
    const visible = [{id: 1, latitude: -103.5917, longitude:  40.6699}, {id: 1, latitude: -103.5917, longitude:  40.6699}, {id: 1, latitude: -103.5917, longitude:  40.6699}, {id: 1, latitude: -103.5917, longitude:  40.6699}]
    mapRef.current.on('load', onLoad);

    return () => mapRef.current.remove();
  }, []);

  return <div id="map" ref={mapContainerRef} style={{ height: '100vh' }}></div>;
};

export default MapboxExample;