// รายงานปัญหาการใช้ AI (shopper) — ตอนนี้รับเฉพาะ "ภาพที่ AI สร้างผิดพลาด"
export type AiReportCategory = "TRY_ON";

export type AiReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AiReport = {
  id: string;
  user_id: string;
  category: AiReportCategory;
  title: string;
  message: string;
  page_url: string | null;
  image_url: string | null;
  status: AiReportStatus;
  created_at: string;
};
