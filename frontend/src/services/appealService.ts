import api from "./api";
import type { Appeal } from "../types/appeal";

// ยื่นคำร้องขอปลดระงับบัญชี — auth ด้วย cookie appeal_token (ออกตอน login แล้วโดนแจ้งว่าถูกระงับ)
export async function submitAppeal(data: {
  title: string;
  message: string;
}): Promise<Appeal> {
  const response = await api.post<{ appeal: Appeal }>("/appeals", data);
  return response.data.appeal;
}

// ดูคำร้องของตัวเอง (ล่าสุดก่อน)
export async function getMyAppeals(): Promise<Appeal[]> {
  const response = await api.get<{ appeals: Appeal[] }>("/appeals/mine");
  return response.data.appeals;
}
