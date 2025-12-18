import type { Position, FeatureCollection } from "geojson";

export type IceExtentResponse = {
    date: string;
    source: string;
    radius_km: number;
    feature_collection: FeatureCollection;
};

export type AvailableDatesResponse = {
    count: number;
    dates: string[]; // ISO YYYY-MM-DD
};

export type YearResponse = {
    year: number;
    radius_km: number;
    days: Array<{
        date: string; // YYYY-MM-DD
        source: string;
        feature_collection: FeatureCollection;
    }>;
};

export interface PredictionRequest {
    start: Position;
    end: Position;
}

export type IcePredictionResponse = {
    date: string;
    radius_km: number;
    threshold: number;
    feature_collection: FeatureCollection;
};

export type ChatMessageResponse = {
    reply: string;
    note?: string;
};
