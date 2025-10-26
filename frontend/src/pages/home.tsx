import { useCallback, useState } from "react";
import { Calendar } from "../components/Calendar";
import MapView from "../components/MapView";
import RightStatsPanel from "../components/RightStatsPanel";
import type { RouteControls } from "../components/routePredictions/AnimatedRouteOverlay";
import { useTranslation } from 'react-i18next';
import { ParameterTools } from '../components/ParameterTools'; 
import { HamburgerButton } from '../components/HamburgerButton';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SMSNotifications from '../components/SMSNotifications';

const HomePage = () => {
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeControls, setRouteControls] = useState<RouteControls>({
    clearMarkers: () => {},
    hasMarkers: false,
  });

  const handleRouteControlsChange = useCallback((controls: RouteControls) => {
    setRouteControls((prev) => {
      if (prev.clearMarkers === controls.clearMarkers && prev.hasMarkers === controls.hasMarkers) {
        return prev;
      }
      return controls;
    });
  }, []);

  const routeStatusLabel =
    routeStatus === "requesting"
      ? "Calculating route..."
      : routeControls.hasMarkers
      ? "Pins ready. Start animation on map."
      : "Tap the map twice to set route pins.";

  return (
    <div className="app-shell">
      <SMSNotifications />
      <div className="map-frame">
        <div className="tool-bar">
          <div id="mission-tools-panel">
            <div className="tool-card tool-card--stacked tool-card--route">
              <h3>Route Tools</h3>
              <button
                type="button"
                onClick={routeControls.clearMarkers}
                disabled={!routeControls.hasMarkers || routeStatus === "requesting"}
              >
                Clear pins
              </button>
              <span className="animated-route-status">{routeStatusLabel}</span>
            </div>
          </div>
        </div>

        {/* Persistent vertical date slider, independent of the tool bar */}
        <Calendar />

        <MapView
          onRouteStatusChange={setRouteStatus}
          onRouteControlsChange={handleRouteControlsChange}
        />
      </div>
      <RightStatsPanel />
    </div>
  );
};

export default HomePage;
