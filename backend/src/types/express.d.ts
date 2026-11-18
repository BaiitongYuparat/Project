import { AdminRole, BrandMemberRole, BrandStatus } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      // บัญชี shopper (ตาราง User) — ไม่มี role แล้ว
      user?: {
        id: string;
        email: string;
        name: string | null;
        status: string;
      };
      // บัญชีฝั่งผู้ดูแล (ตาราง Admin)
      admin?: {
        id: string;
        email: string;
        name: string | null;
        status: string;
        role: AdminRole;
      };
      brand?: {
        id: string;
        brand_name: string;
        slug: string;
        status: BrandStatus;
        role: BrandMemberRole;
      };
    }
  }
}

export {}
