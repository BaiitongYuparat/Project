// คำร้องขอปลดระงับบัญชี (shopper)
export type AppealStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Appeal = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  status: AppealStatus;
  admin_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

// ข้อมูลคำร้องแบบย่อ (จาก response ตอน login โดนปฏิเสธ)
export type AppealSummary = Pick<
  Appeal,
  "id" | "status" | "admin_note" | "created_at" | "decided_at"
>;
