import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { signToken } from "../../lib/jwt";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const logingoogle = async (req: Request, res: Response) => {
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

        //หาจาก googleId ก่อน แล้ว fallback ไปหาด้วย email
        let user = await prisma.user.findUnique({
            where: { googleId: payload.sub },
        });

        // สมัครครั้งแรก 
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: payload.email,
                    googleId: payload.sub,
                    name: payload.name ?? null,
                    phone: null,
                },
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({ message: "Account is not active" });
        }

        const token = signToken(user.id);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });


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