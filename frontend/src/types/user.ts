export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";
export type UserRole = "USER" | "SUPER_ADMIN";

export type BrandMemberRole = "OWNER" | "ADMIN";

export type BrandMembership = {
    brandId: string;
    brandName: string;
    brandStatus: string;
    role: BrandMemberRole;
    slug: string;
};

export type User = {
    id: string;
    email: string;
    name: string | null;
    gender: Gender | null;
    role: UserRole;
    brandMemberships: BrandMembership[];
     isActive?: boolean;
    
}