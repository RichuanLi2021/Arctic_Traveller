import { useCallback, useState } from "react";
import { DateSlider } from "../components/Slider";
import MapView from "../components/MapView";
import RightStatsPanel from "../components/RightStatsPanel";
import type { RouteControls } from "../types/domain";
import type { FeatureCollection } from "geojson";
import RouteToolsPanel from "../components/RouteToolsPanel";
import PredictIcePanel from "../components/PredictIcePanel";
import FloatingChatbot from "../components/FloatingChatbot";

const HomePage = () => {
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeControls, setRouteControls] = useState<RouteControls>({
    clearMarkers: () => { },
    hasMarkers: false,
  });
  const [predictedData, setPredictedData] = useState<FeatureCollection | null>(null);

  const handleRouteControlsChange = useCallback((controls: RouteControls) => {
    setRouteControls((prev) => {
      if (prev.clearMarkers === controls.clearMarkers && prev.hasMarkers === controls.hasMarkers) {
        return prev;
      }
      return controls;
    });
  }, []);

  return (
    <div className="app-shell">
      <div className="map-frame">
        <div className="tool-stack">
          <RouteToolsPanel routeControls={routeControls} routeStatus={routeStatus} />
          <PredictIcePanel onPredicted={setPredictedData} />
        </div>

        <DateSlider />
        <MapView
          onRouteStatusChange={setRouteStatus}
          onRouteControlsChange={handleRouteControlsChange}
          predictedData={predictedData}
        />
      </div>
      <RightStatsPanel predictedData={predictedData} />
      <FloatingChatbot />
    </div>
  );
};

export default HomePage;
