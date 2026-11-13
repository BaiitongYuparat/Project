
import { Request, Response, NextFunction } from "express";
import {
  getBrandAccess,
  BrandAccessError,
} from "../services/brandAccessService";
import {
  getCachedBrandAccess,
  setCachedBrandAccess,
} from "../utils/accessCache";
import { AdminRole } from "@prisma/client";

export const requireBrandAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = req.admin?.id;
    const adminRole = req.admin?.role;
    const { slug } = req.params;

    if (!adminId || !adminRole) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ไม่อนุญาตให้ Super Admin เข้า Shop Dashboard
    if (adminRole === AdminRole.SUPER_ADMIN) {
      return res.status(403).json({
        message: "Super Admin cannot access Brand Dashboard",
      });
    }

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        message: "Invalid brand slug",
      });
    }

    // ตรวจสิทธิ์เข้าร้าน — ใช้ cache ได้เฉพาะ GET เท่านั้น
    // mutation ต้อง query สดเสมอ เพราะ req.brand.role ถูกใช้ตัดสินสิทธิ์ใน controller
    let result =
      req.method === "GET"
        ? getCachedBrandAccess(adminId, slug)
        : undefined;

    if (!result) {
      result = await getBrandAccess(
        slug,
        adminId,
      );

      // เก็บผลลัพธ์ที่ผ่านแล้ว (getBrandAccess throw ถ้าไม่ผ่าน — ไม่ cache กรณีถูกปฏิเสธ)
      if (req.method === "GET") {
        setCachedBrandAccess(adminId, slug, result);
      }
    }

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
