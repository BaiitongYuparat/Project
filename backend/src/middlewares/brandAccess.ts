
import { Request, Response, NextFunction } from "express";
import {
  getBrandAccess,
  BrandAccessError,
} from "../services/brandAccessService";
import { UserRole } from "@prisma/client";

export const requireBrandAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;

    if (!userId || !userRole) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ไม่อนุญาตให้ Super Admin เข้า Shop Dashboard
    if (userRole === UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        message: "Super Admin cannot access Brand Dashboard",
      });
    }

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        message: "Invalid brand slug",
      });
    }

    const result = await getBrandAccess(
      slug,
      userId,
    );

    // แนบข้อมูล Brand และ Role ให้ Controller ใช้ต่อ
    req.brand = {
      ...result.brand,
      role: result.role,
    };

    return next();

  } catch (error) {
    if (error instanceof BrandAccessError) {
      return res.status(error.statusCode).json({
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Brand access middleware error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
