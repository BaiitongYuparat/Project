import { UserRole } from "@prisma/client";
export {}

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
    }
  }
}