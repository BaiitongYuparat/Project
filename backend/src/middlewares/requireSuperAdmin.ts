import { Request, Response, NextFunction } from "express";
import { AdminRole } from "@prisma/client";

// ต้องรันหลัง adminAuthMiddleware เสมอ (req.admin มาจากตาราง Admin)
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ตรวจสอบว่ามีข้อมูล Admin จาก adminAuthMiddleware หรือไม่
    if (!req.admin) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ตรวจสอบ Role
    if (req.admin.role !== AdminRole.SUPER_ADMIN) {
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
