import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
    const { idToken } = req.body;
    try {

        // ตรวจ token กับ Google
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();


        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({ message: "Email not verified" });
        }

        // สมัครครั้งแรก หรือล็อกอินบัญชีเดิม
        const user = await prisma.user.upsert({
            where: { email: payload.email },
            update: { googleId: payload.sub },
            create: {
                email: payload.email,
                googleId: payload.sub,
                name: payload.name ?? null,
            },
        });

        if (user.status !== "active") {
            return res.status(403).json({ message: "Account is not active" });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "7d",
        });

        res.json({ token, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Google authentication failed" });
    }
}

export const loginUser = async (req: Request, res: Response) => {

}

export const logoutUser = async (req: Request, res: Response) => {

}