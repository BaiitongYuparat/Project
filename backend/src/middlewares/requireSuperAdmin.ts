import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ตรวจสอบว่ามีข้อมูล User จาก authMiddleware หรือไม่
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ตรวจสอบ Role
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        message: "Access denied. Super Admin only.",
      });
    }

    return next();

  } catch (error) {
    console.error("Super Admin middleware error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};