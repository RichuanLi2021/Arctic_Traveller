import { useMemo, useState, useEffect } from "react";
import { useIceExtentContext } from "../context/IceExtentContext";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs, { Dayjs } from 'dayjs';
import "./styles/Calendar.css";

type CalendarProps = {
  value?: string; // ISO date string
  onChange?: (isoDate: string) => void;
  propMinDate?: string; // ISO date string
  availableDates?: string[]; // For disabling dates
};

export const Calendar = ({ value, onChange, propMinDate, availableDates: propAvailableDates }: CalendarProps = {}) => {
  // Try to get context, but it might not be available in standalone mode
  let contextValue;
  try {
    contextValue = useIceExtentContext();
  } catch {
    contextValue = undefined;
  }

  // Use props if provided, otherwise fall back to context
  const isoDate = value ?? contextValue?.isoDate;
  const setDateFromIso = onChange ?? contextValue?.setDateFromIso;
  const availableDates = propAvailableDates ?? contextValue?.availableDates;

  const availableSet = useMemo(() => new Set(availableDates ?? []), [availableDates]);

  const { minDate: computedMinDate, maxDate: computedMaxDate } = useMemo(() => {
    if (!availableDates || availableDates.length === 0) {
      return {
        minDate: propMinDate ? dayjs(propMinDate) : undefined,
        maxDate: undefined
      };
    }
    const sorted = [...availableDates].sort();
    return {
      minDate: dayjs(sorted[0]),
      maxDate: dayjs(sorted[sorted.length - 1])
    };
  }, [availableDates, propMinDate]);

  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (isoDate) {
      setSelectedDate(dayjs(isoDate));
    }
  }, [isoDate]);

  const shouldDisableDate = (date: Dayjs) => {
    // If no available dates are provided (standalone mode), don't disable any dates
    if (!availableDates || availableDates.length === 0) {
      return false;
    }
    // Otherwise, disable dates that are not in the available set
    return !availableSet.has(date.format('YYYY-MM-DD'));
  };

  const handleGo = () => {
    if (selectedDate && setDateFromIso) {
      setDateFromIso(selectedDate.format('YYYY-MM-DD'));
      setIsJumpOpen(false);
    }
  };

  return (
    <div className="calendar-quick-box">
      <div className="jump-header">
        <button
          type="button"
          className="jump-trigger"
          onClick={() => setIsJumpOpen((v) => !v)}
          disabled={!availableDates?.length}
          aria-label="Open date picker"
        >
          <span
            style={{
              filter: 'brightness(0) invert(1)'
            }}>
            📅
          </span>
        </button>
      </div>
      <div className={`jump-calendar ${isJumpOpen ? "is-open" : ""}`}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            shouldDisableDate={shouldDisableDate}
            minDate={computedMinDate}
            maxDate={computedMaxDate}
            showDaysOutsideCurrentMonth
            fixedWeekNumber={6}
          />
        </LocalizationProvider>
        <button
          type="button"
          onClick={handleGo}
          disabled={!selectedDate}
          className="jump-calendar__go"
        >
          Go
        </button>
      </div>
    </div>
  );
};