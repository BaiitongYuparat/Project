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

export async function getBody(userId: string): Promise<BodyData> {
  const response = await api.get<{ body: BodyData }>(`/body/${userId}`);
  return response.data.body;
}

export async function createBody(userId: string, data: BodyForm): Promise<BodyData> {
  const response = await api.post<{ body: BodyData }>(`/body/${userId}`, data);
  return response.data.body;
}

export async function updateBody(userId: string, data: BodyForm): Promise<BodyData> {
  const response = await api.put<{ body: BodyData }>(`/body/${userId}`, data);
  return response.data.body;
}