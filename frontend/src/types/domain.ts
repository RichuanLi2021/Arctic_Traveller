import type { FeatureCollection } from "geojson";
import type { IceExtentResponse } from "./api";

export type RouteControls = {
    clearMarkers: () => void;
    hasMarkers: boolean;
};

export type IceExtentContextValue = {
    selectedDate: Date;
    isoDate: string;
    availableDates: string[];
    data: FeatureCollection | null;
    metadata: Omit<IceExtentResponse, "feature_collection"> | null;
    isLoading: boolean;
    error?: string;
    shiftDate: (days: number) => void;
    setDateFromIso: (isoDate: string) => void;
    refetch: () => void;
};
