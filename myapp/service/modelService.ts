import api from "./api";

export type ModelGender = "MALE" | "FEMALE" | "UNSPECIFIED" | null;

/** โมเดลสำหรับลองใส่ (จัดการโดย super admin ใน Model Management) */
export interface TryOnModel {
  id: string;
  name: string;
  gender: ModelGender;
  bust: number | string | null;
  waist: number | string | null;
  hips: number | string | null;
  height: number | string | null;
  image_front: string;
  image_back: string | null;
  image_left: string | null;
  image_right: string | null;
  supported_sizes: string[];
}

export const getModels = async (): Promise<TryOnModel[]> => {
  const response = await api.get<TryOnModel[]>("/models");
  return response.data;
};
