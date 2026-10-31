import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";

export const getconsent = async(req:Request , res: Response) => {
    const userId = req.user!.id as string
    try {
        const consent = await prisma.userConsent.findMany({
             where: { user_id: userId }
        })
        res.status(200).json(consent);
    }catch(error){
        res.status(500).json({ error: "Failed to fetch UserConsent" });
    }
}

export const setConsent = async(req: Request ,  res: Response) => {
    
}