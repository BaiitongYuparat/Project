import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { signToken } from "../../lib/jwt";

const googleClient = new OAuth2Client();

const allowedAudiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID_APP,
].filter(Boolean) as string[];


export const logingoogle = async (req: Request, res: Response) => {
    const { idToken } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: allowedAudiences,
        });

        const payload = ticket.getPayload();


        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({ message: "Email not verified" });
        }

        const { sub: googleId, email, name } = payload;

        // หาผู้ใช้ แล้วสร้างใหม่หรือเชื่อมบัญชีตามกรณี
        try {
            // หาจาก googleId ก่อน แล้ว fallback ไปหาด้วย email
            let user = await prisma.user.findFirst({
                where: { OR: [{ googleId }, { email }] },
            });

            if (!user) {
                // สมัครครั้งแรก
                user = await prisma.user.create({
                    data: { email, googleId, name: name ?? null },
                });
            } else if (!user.googleId) {
                // มีบัญชีอีเมลอยู่แล้ว ให้เชื่อม Google เข้าไป
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId },
                });
            }

            if (user.status !== "active") {
                return res.status(403).json({ message: "Account is not active" });
            }

            const token = signToken(user.id);
            return res.json({
                token,
                user: { id: user.id, email: user.email, name: user.name },
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }

    } catch (error) {
        console.error(error);
        res.status(401).json({ error: "Google authentication failed" });
    }
};



export const logoutUser = async (req: Request, res: Response) => {
    return res.status(200).json({
        message: "Logout success"
    });
}