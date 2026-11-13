export type BrandStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BrandMemberRole = "OWNER" | "ADMIN";

export type RegisterBrandResponse = {
  id: string;
  brand_name: string;
  status: BrandStatus;
  created_at: string;
};

export type Brand = {
  id: string;
  brand_name: string;
  owner_name: string;
  email: string | null;
  store_url: string | null;
  status: BrandStatus;
  created_at: string;
};

export type BrandDetail = Brand & {
  phone_number: string | null;
  ebiz_reg_no: string | null;
  ebiz_file_url: string | null;
};

export type CheckBrandAccessResponse = {
  authorized: boolean;
  brand: {
    id: string;
    brand_name: string;
    slug: string;
    status: BrandStatus;
  };
  role: BrandMemberRole
};

// ข้อมูลร้านสำหรับหน้า Store Settings (logo_url เป็น signed URL จาก backend)
export type BrandSettings = {
  id: string;
  brand_name: string;
  slug: string;
  email: string | null;
  phone_number: string | null;
  store_url: string | null;
  status: BrandStatus;
  description: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  line_id: string | null;
  logo_url: string | null;
  created_at: string;
};

export type UpdateBrandSettingsResponse = {
  message: string;
  brand: BrandSettings;
};

// types/brand.ts
export type BrandMember = {
  id: string;
  role: BrandMemberRole;
  created_at: string;
  name: string | null;
  email: string;
  brand_id: string;
  brand_name: string;
  brand_status: BrandStatus;
};

export interface BrandMembersResponse {
  currentRole: BrandMemberRole
  members: BrandMember[];
}