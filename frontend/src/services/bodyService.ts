import api from "./api";

export interface BodyData {
  id?: string;
  user_id?: string;
  height: number | null;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  recorded_at?: string;
}
export type BodyForm = {
    body: BodyData
}

export async function getBody(): Promise<BodyData> {
  const response = await api.get<BodyData>("/body");
  return response.data;
}

export async function createBody(data: BodyData): Promise<BodyData> {
  const response = await api.post<{ body: BodyData }>("/body", data);
  return response.data.body;
}

export async function updateBody(data: BodyData): Promise<BodyData> {
  const response = await api.put<BodyData>("/body", data);
  return response.data;
}