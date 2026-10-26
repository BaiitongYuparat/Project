import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { verifyToken } from "../../lib/jwt";


declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string | null;
                status: string;
            };
        }
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    
    try {
        // 1. ดึง token จาก header: Authorization: Bearer <token>
        const authHeader = req.headers.authorization;

        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : req.cookies?.token;

        if (!token || typeof token !== "string") {
            return res.status(401).json({ message: "Missing authentication token" });
        }
        const { userId } = verifyToken(token);
 
        // 2. หา user จาก DataBase (กันกรณี user ถูกระงับ/ลบหลังออก token ไปแล้ว)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, status: true },
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if (user.status !== "active") {
            return res.status(403).json({ message: "Account is not active" });
        }

        // 3. แนบ user เข้า request แล้วไปต่อ
        req.user = user;
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
