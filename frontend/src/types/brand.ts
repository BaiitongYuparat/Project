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

// types/brand.ts
export type BrandMember = {
  id: string;
  role: BrandMemberRole;
  created_at: string;
  user_name: string | null;
  email: string;
  brand_id: string;
  brand_name: string;
  brand_status: BrandStatus;
};