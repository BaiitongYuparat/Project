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
  const response = await api.get<BodyData>("/body/latest");
  return response.data;
}

export async function createBody(data: BodyData): Promise<BodyData> {
  const response = await api.post<BodyData>("/body", data);
  return response.data;
}

export async function updateBody(data: BodyData): Promise<BodyData> {
  const response = await api.put<BodyData>("/body", data);
  return response.data;
}
export interface SavedImage {
  angle: string;
  s3: string;
}

export async function getBodyImages(bodyId: string): Promise<SavedImage[]> {
  const res = await api.get(`/images/body/${bodyId}`);
  return res.data.data;
}

export async function verifyBodyImage(angle: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post(`/images/verify/${angle}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.tempKey;
}

export async function saveBodyImages(
  bodyId: string,
  tempKeys: Partial<Record<string, string>>
): Promise<void> {
  await api.post("/images/body", { body_id: bodyId, tempKeys });
}