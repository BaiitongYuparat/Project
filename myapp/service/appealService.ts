import api from "./api";

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

// แอปเก็บ cookie ไม่ได้ → ใช้ appealToken ที่ backend ส่งมาตอน login (อายุ 15 นาที) ผ่าน header
const appealHeaders = (appealToken: string) => ({ "x-appeal-token": appealToken });

export async function submitAppeal(
  appealToken: string,
  data: { title: string; message: string },
): Promise<Appeal> {
  const res = await api.post<{ appeal: Appeal }>("/appeals", data, {
    headers: appealHeaders(appealToken),
  });
  return res.data.appeal;
}

// คำร้องของตัวเอง (ล่าสุดก่อน)
export async function getMyAppeals(appealToken: string): Promise<Appeal[]> {
  const res = await api.get<{ appeals: Appeal[] }>("/appeals/mine", {
    headers: appealHeaders(appealToken),
  });
  return res.data.appeals;
}

export const toAppealSummary = (a: Appeal): AppealSummary => ({
  id: a.id,
  status: a.status,
  admin_note: a.admin_note,
  created_at: a.created_at,
  decided_at: a.decided_at,
});
