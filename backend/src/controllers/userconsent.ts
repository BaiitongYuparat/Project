import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";

export const getconsent = async(req:Request , res: Response) => {
    try {
        const consent = await prisma.userConsent.findMany()
        res.status(200).json(consent);
    }catch(error){
        res.status(500).json({ error: "Failed to fetch UserConsent" });
    }
}

export const getconsentId = async(req:Request , res: Response) => {
     const userId = req.user!.id as string
    try {
        const consent = await prisma.userConsent.findFirst({
            where: { user_id: userId },
        })
        if(!consent) {
            return res.status(404).json({ error: "UserConsent data not found" });
        }
        res.status(200).json(consent);
    }catch(error){
        res.status(500).json({ error: "Failed to fetch UserConsent" });
    }
}

