export type UserRole = "USER" | "SUPER_ADMIN";

export type BrandMemberRole = "OWNER" | "ADMIN";

export interface BrandMembership {
  brandId: string;
  brandName: string;
  brandStatus: string;
  role: BrandMemberRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  brandMemberships: BrandMembership[];
}