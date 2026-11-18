// รายงานปัญหาการใช้ AI (มุมมอง Super Admin) — ประเภทเดียว: ภาพที่ AI สร้างผิดพลาด
export type AiReportCategory = "TRY_ON";

export type AiReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AiReportUser = {
  id: string;
  name: string | null;
  email: string;
  status: string; // "active" | "suspended"
};

export type AiReport = {
  id: string;
  user_id: string;
  category: AiReportCategory;
  title: string;
  message: string;
  page_url: string | null;
  image_url: string | null; // presigned URL จาก backend
  status: AiReportStatus;
  admin_note: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
  user: AiReportUser;
};
