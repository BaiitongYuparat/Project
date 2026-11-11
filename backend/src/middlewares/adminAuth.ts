import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { verifyAdminToken } from "../../lib/jwt";

// Middleware สำหรับบัญชีฝั่งผู้ดูแล (ตาราง Admin) — อ่าน cookie admin_token หรือ Bearer header
export const adminAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    try {
        // 1. ดึง token จาก header: Authorization: Bearer <token> (fallback: cookie admin_token)
        const authHeader = req.headers.authorization;

        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : req.cookies?.admin_token;

        if (!token || typeof token !== "string") {
            return res.status(401).json({ message: "Missing authentication token" });
        }
        const { adminId } = verifyAdminToken(token);

        // 2. หา admin จากฐานข้อมูล (กันกรณีถูกระงับ/ลบหลังออก token ไปแล้ว)
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { id: true, email: true, name: true, status: true, role: true },
        });

        if (!admin) {
            return res.status(401).json({ message: "Admin not found" });
        }

        if (admin.status !== "active") {
            return res.status(403).json({ message: "Account is not active" });
        }

        // 3. แนบ admin เข้า request แล้วไปต่อ
        req.admin = admin;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Token expired" });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        return res.status(500).json({ message: "Authentication failed" });
    }
};
