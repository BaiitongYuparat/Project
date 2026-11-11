import api from "../api";
import type { Model } from "../../types/model";

const baseUrl = "/admin/models";

export async function getModels(): Promise<Model[]> {
  const response = await api.get(baseUrl);
  return response.data;
}