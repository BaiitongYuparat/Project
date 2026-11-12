// คำร้องขอปลดระงับบัญชี shopper (ฝั่ง Super Admin)
export type AppealStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AppealUser = {
  id: string;
  name: string | null;
  email: string;
  status: string; // "active" | "suspended"
};

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
  user: AppealUser;
};
