import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { verifyAppealToken } from "../../lib/jwt";

// Auth สำหรับ endpoint คำร้องขอปลดระงับ (/appeals)
// ใช้ cookie appeal_token (อายุ 15 นาที, scope=appeal) ที่ออกให้ตอน login แล้วโดนปฏิเสธเพราะบัญชีถูกระงับ
// ไม่ตรวจ user.status — เพราะผู้ยื่นคำร้องคือบัญชีที่ถูกระงับตั้งแต่ต้น
export const appealAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.appeal_token;

        if (!token || typeof token !== "string") {
            return res.status(401).json({
                message: "Missing appeal token — กรุณาเข้าสู่ระบบเพื่อยืนยันตัวตนก่อน",
            });
        }

        const { userId } = verifyAppealToken(token);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, status: true },
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Appeal token expired" });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Invalid appeal token" });
        }
        console.error(error);
        return res.status(500).json({ message: "Authentication failed" });
    }
};
