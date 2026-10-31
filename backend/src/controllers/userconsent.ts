import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";

const CONSENT_TYPES = ["body_data", "photo_analysis"];

export const getconsent = async (req: Request, res: Response) => {
    const userId = req.user!.id as string
    try {
        const consent = await prisma.userConsent.findMany({
            where: { user_id: userId }
        })
        res.status(200).json(consent);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch UserConsent" });
    }
}

export const setConsent = async (req: Request, res: Response) => {
    const userId = req.user!.id as string;
    const { consents } = req.body;
    try {
         const now = new Date();
        const results = await prisma.$transaction(
            consents.map(({ type, granted }: { type: string; granted: boolean }) => {
                const data = granted
                    ? { granted: true, granted_at: now, revoked_at: null }
                    : { granted: false, revoked_at: now };
 
                return prisma.userConsent.upsert({
                    
                    where: { user_id_type: { user_id: userId, type } },
                    update: data,
                    create: { user_id: userId, type, ...data },
                });
            })
        );
        res.status(201).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save consent" });
    }
}