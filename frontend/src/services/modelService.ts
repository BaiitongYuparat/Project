import api from "./api";

export type ModelGender = "MALE" | "FEMALE" | "UNSPECIFIED" | null;

/** โมเดลสำหรับลองใส่ (จัดการโดย super admin ใน Model Management) */
export interface TryOnModel {
  id: string;
  name: string;
  gender: ModelGender;
  bust: number | null;
  waist: number | null;
  hips: number | null;
  height: number | null;
  image_front: string;
  image_back: string | null;
  image_left: string | null;
  image_right: string | null;
  supported_sizes: string[];
}

/** ดึงเฉพาะโมเดลที่เปิดใช้งานและให้ลูกค้าเลือกได้ */
export async function getModels(): Promise<TryOnModel[]> {
  const response = await api.get<TryOnModel[]>("/models");
  return response.data;
}
