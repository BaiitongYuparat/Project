import { UserRole ,BrandStatus , BrandMemberRole} from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        status: string;
        role: UserRole;
      };
      brand?: {
        id: string;
        brand_name: string;
        slug: string;
        status: BrandStatus;
        role: UserRole | BrandMemberRole;
      };
    }
  }
}

export {}