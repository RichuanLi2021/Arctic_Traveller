import api from "../api/mapAPI";
import type { IcePredictionResponse } from "../types/api";

export const predictIceExtent = async (
  date: string,
  radiusKm = 500,
  thresh = 0.5
): Promise<IcePredictionResponse> => {
  try {
    const response = await api.get<IcePredictionResponse>("/ice_extent/predict", {
      params: { date, radius_km: radiusKm, thresh },
    });
    return response.data;
  } catch (err: any) {
    const status = err?.response?.status ?? "network";
    throw new Error(`Prediction request failed! (${status})`);
  }
};
