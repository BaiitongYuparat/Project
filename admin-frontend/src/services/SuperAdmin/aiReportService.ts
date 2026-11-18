import api from "../api";
import type { AiReport, AiReportStatus } from "../../types/aiReport";

const baseUrl = "/admin/ai-reports";

// รายการรายงานปัญหาการใช้ AI ทั้งหมด (กรองตามสถานะได้)
export async function getAiReports(
  status?: AiReportStatus | "ALL"
): Promise<AiReport[]> {
  const query = status && status !== "ALL" ? `?status=${status}` : "";
  const response = await api.get<AiReport[]>(`${baseUrl}${query}`);
  return response.data;
}

// อัปเดตสถานะ + บันทึกของ Super Admin
export async function updateAiReportStatus(
  id: string,
  status: AiReportStatus,
  adminNote?: string
): Promise<AiReport> {
  const response = await api.put<{ report: AiReport }>(
    `${baseUrl}/${id}/status`,
    { status, admin_note: adminNote }
  );
  return response.data.report;
}
