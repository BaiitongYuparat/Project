export type Gender = "MALE" | "FEMALE";

// บทบาทร้านค้า (ใช้ทั้งฝั่ง shopper และ admin)
export type BrandMemberRole = "OWNER" | "ADMIN";

export type BrandMembership = {
    brandId: string;
    brandName: string;
    brandStatus: string;
    role: BrandMemberRole;
    slug: string;
};

// shopper เท่านั้น — บัญชีผู้ดูแลแยกไปตาราง Admin และ login คนละหน้า (/admin/login)
export type User = {
    id: string;
    email: string;
    name: string | null;
    gender: Gender | null;
    isActive?: boolean;
    status?: "active" | "suspended" | string;
}
