import api from "./api";
import type { BodyTypeData } from "../store/bodyTypeSlice";

export async function getBodyType(): Promise<BodyTypeData> {
  const response = await api.get<{ data: BodyTypeData }>("/body-type");
  return response.data.data;
}

export async function analyzeBodyType(): Promise<BodyTypeData> {
  const response = await api.post<{ data: BodyTypeData }>("/body-type/analyze");
  return response.data.data;
}