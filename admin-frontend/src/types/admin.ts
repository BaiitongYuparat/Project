import type { BrandMembership, BrandMemberRole } from "./user";

// บัญชีฝั่งผู้ดูแล (ตาราง Admin) — login ที่ /admin/login แยกจาก shopper
export type AdminRole = "SUPER_ADMIN" | "SHOP_ADMIN";

export type Admin = {
    id: string;
    email: string;
    name: string | null;
    role: AdminRole;
    status?: "active" | "suspended" | string;
    // ร้านที่ดูแล (มีเฉพาะ SHOP_ADMIN)
    brandMemberships: BrandMembership[];
};

export type BrandMemberRoleType = BrandMemberRole;
