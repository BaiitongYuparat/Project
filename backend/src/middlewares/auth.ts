import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

interface AuthTokenPayload extends JwtPayload {
    userId: string;
}

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

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing or invalid Authorization header" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
            algorithms: ["HS256"],
        }) as AuthTokenPayload | string;

        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        // 3. หา user จาก DB (กันกรณี user ถูกระงับ/ลบหลังออก token ไปแล้ว)
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, status: true },
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if (user.status !== "active") {
            return res.status(403).json({ message: "Account is not active" });
        }

        // 4. แนบ user เข้า request แล้วไปต่อ
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
