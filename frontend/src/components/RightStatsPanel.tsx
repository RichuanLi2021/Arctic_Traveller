import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { useIceExtentContext } from "../context/IceExtentContext";
import { getGlobalTemperatureAnomaly } from "../helper/globalTemperature";

type RightStatsPanelProps = {
  predictedData?: FeatureCollection | null;
};

const formatNumber = (value: number | null | undefined) => {
  if (!Number.isFinite(value ?? NaN)) return "—";
  return (value as number).toLocaleString();
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "2-digit" }).format(dt);
};

const getFilename = (path?: string) => {
  if (!path) return "—";
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] ?? path;
};

const formatTemperature = (value: number | null) => {
  if (value == null) return "—";
  const rounded = value.toFixed(2);
  return `${value > 0 ? "+" : ""}${rounded}°C`;
};

const RightStatsPanel = ({ predictedData }: RightStatsPanelProps) => {
  const { isoDate, data, metadata, availableDates, isLoading, error } = useIceExtentContext();

  const observedCount = data?.features?.length ?? 0;
  const predictedCount = predictedData?.features?.length ?? 0;

  const archiveRange = useMemo(() => {
    if (!availableDates.length) return { start: "—", end: "—" };
    const start = formatDate(availableDates[0]);
    const end = formatDate(availableDates[availableDates.length - 1]);
    return { start, end };
  }, [availableDates]);

  const snapshotDate = metadata?.date ?? isoDate;
  const snapshotLabel = isLoading ? "Loading..." : formatDate(snapshotDate);
  const statusMeta = error ? "Data unavailable" : metadata?.source ? getFilename(metadata.source) : "GeoTIFF import";
  const radiusMeta = metadata?.radius_km != null
    ? `Beyond ${formatNumber(metadata.radius_km)} km radial filter`
    : "Default radial filter applied";
  const temperatureAnomaly = useMemo(
    () => getGlobalTemperatureAnomaly(snapshotDate),
    [snapshotDate]
  );
  const temperatureLabel = formatTemperature(temperatureAnomaly);
  const temperatureMeta = `12-month mean for ${formatDate(snapshotDate)} vs. 1850–1900 baseline`;

  return (
    <aside className="stats-panel">
      <header className="stats-panel__header">
        <h1 className="stats-panel__title">Arctic Ice Metrics</h1>
        <p className="stats-panel__subtitle">
          Track monthly sea ice loss, extent, and related climate indicators.
        </p>
      </header>

      <div className="stats-panel__grid">
        <section className="stats-card stats-card--wide">
          <h2 className="stats-card__label">Observed Snapshot</h2>
          <p className="stats-card__value">{snapshotLabel}</p>
          <p className="stats-card__meta">{statusMeta}</p>
        </section>

        <section className="stats-card">
          <h2 className="stats-card__label">Detected Ice Cells</h2>
          <p className="stats-card__value">{formatNumber(observedCount)}</p>
          <p className="stats-card__meta">{radiusMeta}</p>
        </section>

        <section className="stats-card">
          <h2 className="stats-card__label">Prediction Overlay</h2>
          <p className="stats-card__value">
            {predictedData ? formatNumber(predictedCount) : "Not active"}
          </p>
          <p className="stats-card__meta">
            {predictedData ? "Modelled ice cells for requested forecast" : "Press Predict to compare future melt"}
          </p>
        </section>

        <section className="stats-card">
          <h2 className="stats-card__label">Archive Coverage</h2>
          <p className="stats-card__value">{archiveRange.start}</p>
          <p className="stats-card__meta">through {archiveRange.end}</p>
        </section>

        <section className="stats-card stats-card--temperature">
          <h2 className="stats-card__label">Global Temp Anomaly</h2>
          <p className="stats-card__value stats-card__value--warm">{temperatureLabel}</p>
          <p className="stats-card__meta">{temperatureMeta}</p>
        </section>

      </div>
    </aside>
  );
};

export default RightStatsPanel;
