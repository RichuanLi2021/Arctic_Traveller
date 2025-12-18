import { useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { predictIceExtent } from "../services/icePredictionAPI";

type PredictIcePanelProps = {
  onPredicted: (
    data: FeatureCollection | null
  ) => void;
};

const PredictIcePanel = ({ onPredicted }: PredictIcePanelProps) => {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [predictDate, setPredictDate] = useState<string>(tomorrow);
  const [predictRadius, setPredictRadius] = useState<number>(500);
  const [predictThresh, setPredictThresh] = useState<number>(0.5);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const handlePredict = async () => {
    setPredicting(true);
    setPredictError(null);
    try {
      const result = await predictIceExtent(predictDate, predictRadius, predictThresh);
      onPredicted(result.feature_collection);
    } catch (err: any) {
      setPredictError(err?.message ?? String(err));
      onPredicted(null);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className={`tool-card tool-card--stacked tool-card--predict accordion ${open ? "is-open" : ""}`}>
      <div className="accordion__header" onClick={() => setOpen((v) => !v)}>
        <h3>Predict Ice</h3>
        <span className="accordion__chevron">{open ? "▾" : "▸"}</span>
      </div>
      {open ? (
        <div className="accordion__body">
          <p className="tool-card__meta">Generate modelled ice points for a future date.</p>
          <label>
            Date
            <input
              type="date"
              min={tomorrow}
              value={predictDate}
              onChange={(e) => setPredictDate(e.target.value)}
              style={{
                colorScheme: 'light'
              }}
            />
          </label>
          <label>
            Radius (km)
            <input
              type="number"
              value={predictRadius}
              onChange={(e) => setPredictRadius(Number(e.target.value))}
            />
          </label>
          <label>
            Threshold
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={predictThresh}
              onChange={(e) => setPredictThresh(Number(e.target.value))}
            />
          </label>
          <div className="predict-controls">
            <button type="button" onClick={handlePredict} disabled={predicting}>
              {predicting ? "Predicting…" : "Predict"}
            </button>
            <button type="button" onClick={() => onPredicted(null)} disabled={predicting}>
              Clear
            </button>
          </div>
          {predictError ? <div className="error">{predictError}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

export default PredictIcePanel;
