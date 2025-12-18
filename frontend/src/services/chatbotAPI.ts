import api from "../api/mapAPI";
import type { ChatMessageResponse } from "../types/api";

export const sendChatMessage = async (message: string): Promise<ChatMessageResponse> => {
  try {
    const res = await api.post<ChatMessageResponse>("/chat", { message });
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status ?? "network";
    throw new Error(`Chat request failed (${status})`);
  }
};
