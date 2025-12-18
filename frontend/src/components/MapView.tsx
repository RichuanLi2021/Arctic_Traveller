import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import parsedEnv from "../config/env";
import { useIceExtentContext } from "../context/IceExtentContext";
import AnimatedRouteOverlay from "./routePredictions/AnimatedRouteOverlay";
import type { RouteControls } from "../types/domain";
import "./styles/MapView.css";

type MapViewProps = {
  onRouteStatusChange?: (status: string) => void;
  onControlsChange?: (controls: RouteControls) => void;
  // Note: previously onRouteControlsChange in some places, unifying on onControlsChange if needed or sticking to prev
  // Wait, home.tsx passes `onRouteControlsChange` to MapView. 
  // Let's check MapView definition again in replace block.
  onRouteControlsChange?: (controls: RouteControls) => void;
  predictedData?: GeoJSON.FeatureCollection | null;
};

const MapView = ({
  onRouteStatusChange,
  onRouteControlsChange,
  predictedData
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [centerPosition, setCenterPosition] = useState<{ lat: number; lng: number } | null>(null);
  const { data: iceData, isLoading } = useIceExtentContext();
  const accessToken = parsedEnv.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!accessToken) {
      console.error("VITE_MAPBOX_TOKEN is missing; Mapbox map cannot initialize.");
      return;
    }
    if (mapRef.current || !mapContainer.current) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-108.9515, 74.7496],
      zoom: 3,
      maxZoom: 8
    });
    mapRef.current = map;

    map.on("load", () => {
      setIsMapLoaded(true);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      setCenterPosition({ lat: center.lat, lng: center.lng });
    });

    return () => {
      setIsMapLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, [accessToken]);

  // Update ice extent data on the map, hide it when predictions are visible
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !iceData) return;

    // Remove previous layer/source if they exist
    if (map.getLayer("iceLoss-fill")) {
      map.removeLayer("iceLoss-fill");
    }
    if (map.getSource("iceLoss")) {
      map.removeSource("iceLoss");
    }

    if (predictedData) return;

    // Add new source and layer
    map.addSource("iceLoss", {
      type: "geojson",
      data: iceData
    });

    map.addLayer({
      id: "iceLoss-fill",
      type: "circle",
      source: "iceLoss",
      paint: {
        "circle-radius": 3,
        "circle-color": "#ff4b4b",
        "circle-opacity": 0.7,
      },
    });
  }, [iceData, isMapLoaded, predictedData]);

  // Update predicted data on the map (separate layer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (map.getLayer("predictedIce-fill")) {
      map.removeLayer("predictedIce-fill");
    }
    if (map.getSource("predictedIce")) {
      map.removeSource("predictedIce");
    }

    if (!predictedData) return;

    map.addSource("predictedIce", {
      type: "geojson",
      data: predictedData,
    });

    map.addLayer({
      id: "predictedIce-fill",
      type: "circle",
      source: "predictedIce",
      paint: {
        "circle-radius": 3,
        "circle-color": "#4bd7ff",
        "circle-opacity": 0.9,
      },
    });
  }, [predictedData, isMapLoaded]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map-canvas" />
      {isLoading ? (
        <div className="map-loading-overlay" role="status" aria-live="polite">
          <div className="map-loading-spinner" />
          <div className="map-loading-text">Loading data…</div>
        </div>
      ) : null}
      {centerPosition ? (
        <div className="map-coordinates">
          <span role="img" aria-label="pin">📍</span>
          {centerPosition.lat.toFixed(4)}, {centerPosition.lng.toFixed(4)}
        </div>
      ) : null}
      <AnimatedRouteOverlay
        map={mapRef.current}
        isMapLoaded={isMapLoaded}
        onStatusChange={onRouteStatusChange}
        onControlsChange={onRouteControlsChange}
      />
    </div>
  );
};

export default MapView;
