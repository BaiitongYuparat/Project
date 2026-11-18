import api from "./api";
import type { AiReport } from "../types/aiReport";

// หัวข้อคงที่ — ผู้ใช้แจ้งได้เฉพาะเรื่องภาพที่ AI สร้างผิดพลาด
export const AI_REPORT_TITLE = "ภาพที่ AI สร้างผิดพลาด";

// ยื่นรายงานปัญหาภาพที่ AI สร้างผิด — multipart/form-data เพื่อแนบภาพหน้าจอได้ 1 ภาพ
export async function submitAiReport(data: {
  message: string;
  page_url?: string;
  image?: File;
}): Promise<AiReport> {
  const form = new FormData();
  form.append("category", "TRY_ON");
  form.append("title", AI_REPORT_TITLE);
  form.append("message", data.message);
  if (data.page_url) form.append("page_url", data.page_url);
  if (data.image) form.append("image", data.image);

  const response = await api.post<{ report: AiReport }>("/ai-reports", form);
  return response.data.report;
}
