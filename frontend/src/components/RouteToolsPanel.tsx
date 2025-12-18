import type { RouteControls } from "../types/domain";
import { useState } from "react";


type RouteToolsPanelProps = {
  routeControls: RouteControls;
  routeStatus: string;
};

const RouteToolsPanel = ({ routeControls, routeStatus }: RouteToolsPanelProps) => {
  const [open, setOpen] = useState(true);

  const routeStatusLabel =
    routeStatus === "requesting"
      ? "Calculating route..."
      : routeControls.hasMarkers
        ? "Pins ready. Start animation on map."
        : "Tap the map twice to set route pins.";

  return (
    <div className={`tool-card tool-card--route accordion ${open ? "is-open" : ""}`}>
      <div className="accordion__header" onClick={() => setOpen((v) => !v)}>
        <h3>Route Tools</h3>
        <span className="accordion__chevron">{open ? "▾" : "▸"}</span>
      </div>
      {open ? (
        <div className="accordion__body">
          <p className="tool-card__meta">Drop two pins on the map to simulate a route.</p>
          <button
            type="button"
            onClick={routeControls.clearMarkers}
            disabled={!routeControls.hasMarkers || routeStatus === "requesting"}
          >
            Clear pins
          </button>
          <span className="animated-route-status">{routeStatusLabel}</span>
        </div>
      ) : null}
    </div>
  );
};

export default RouteToolsPanel;
