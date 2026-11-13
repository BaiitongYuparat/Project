import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { verifyAdminToken } from "../../lib/jwt";
import {
    getCachedAdmin,
    setCachedAdmin,
    invalidateAdminAccess,
    type CachedAdmin,
} from "../utils/accessCache";

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

        // 2. หา admin — ใช้ cache ได้เฉพาะ GET เท่านั้น
        //    mutation ต้อง query สดจาก DB เสมอ (ห้ามใช้ cache ตัดสินสิทธิ์)
        let admin: CachedAdmin | undefined =
            req.method === "GET" ? getCachedAdmin(adminId) : undefined;

        if (!admin) {
            // หา admin จากฐานข้อมูล (กันกรณีถูกระงับ/ลบหลังออก token ไปแล้ว)
            const fetched = await prisma.admin.findUnique({
                where: { id: adminId },
                select: { id: true, email: true, name: true, status: true, role: true },
            });

            if (!fetched) {
                return res.status(401).json({ message: "Admin not found" });
            }

            // เก็บลง cache เฉพาะบัญชีที่ยัง active (สถานะไม่ active ไม่ควรอยู่ใน cache)
            if (fetched.status === "active" && req.method === "GET") {
                setCachedAdmin(adminId, fetched);
            }

            admin = fetched;
        }

        // ตรวจสถานะทุกครั้ง (cache hit ด้วย) — ถ้าไม่ active ให้ evict แล้วปฏิเสธ
        if (admin.status !== "active") {
            invalidateAdminAccess(adminId);
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
