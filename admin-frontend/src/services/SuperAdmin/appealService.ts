import api from "../api";
import type { Appeal, AppealStatus } from "../../types/appeal";

const baseUrl = "/admin/appeals";

// รายการคำร้องทั้งหมด (กรองตามสถานะได้)
export async function getAppeals(
  status?: AppealStatus | "ALL"
): Promise<Appeal[]> {
  const query = status && status !== "ALL" ? `?status=${status}` : "";
  const response = await api.get<Appeal[]>(`${baseUrl}${query}`);
  return response.data;
}

// ตัดสินคำร้อง — APPROVED จะปลดระงับบัญชีผู้ยื่นให้อัตโนมัติ
export async function decideAppeal(
  id: string,
  decision: "APPROVED" | "REJECTED",
  adminNote?: string
): Promise<Appeal> {
  const response = await api.post<{ appeal: Appeal }>(
    `${baseUrl}/${id}/decision`,
    { decision, admin_note: adminNote }
  );
  return response.data.appeal;
}
