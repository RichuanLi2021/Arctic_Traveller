import { useMemo, useState } from "react";
import { useIceExtentContext } from "../context/IceExtentContext";
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import { Calendar } from "./Calendar";
import "./styles/Slider.css";

export const DateSlider = () => {
  const { isoDate, setDateFromIso, availableDates } = useIceExtentContext();

  const list = useMemo(() => {
    return [...(availableDates ?? [])].sort((a, b) => a.localeCompare(b));
  }, [availableDates]);

  const max = Math.max(list.length - 1, 0);
  const sliderIndex = useMemo(() => Math.max(0, list.indexOf(isoDate)), [list, isoDate]);

  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      setPendingIndex(newValue);
    }
  };

  const handleSliderChangeCommitted = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      const iso = list[Math.min(Math.max(newValue, 0), max)];
      if (iso && iso !== isoDate) {
        setDateFromIso(iso);
      }
    }
    setPendingIndex(null);
  };

  const formatDateOnly = (d?: Date | null) => {
    if (!d) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const activeIndex = pendingIndex ?? sliderIndex;

  function valueLabelFormat(value: number) {
    const iso = list[value];
    if (!iso) return '';
    return formatDateOnly(new Date(`${iso}T00:00:00Z`));
  }

  return (
    <div
      className="slider-container"
      style={{ backgroundColor: 'transparent' }}
    >
      <div className="slider-and-labels">
        <span className="year-label">{list[0]?.slice(0, 4) ?? ""}</span>
        <Box sx={{ width: 300, display: 'flex', alignItems: 'center' }}>
          <Slider
            aria-label="date-slider"
            value={activeIndex}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            min={0}
            max={max}
            step={1}
            valueLabelFormat={valueLabelFormat}
            valueLabelDisplay="auto"
            disabled={list.length === 0}
          />
        </Box>
        <span className="year-label">{list[list.length - 1]?.slice(0, 4) ?? ""}</span>
      </div>
      <Calendar />
    </div>
  );
};
