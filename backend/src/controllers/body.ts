import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";

export const getBodyData = async (req: Request, res: Response) => {
    const userId = req.user!.id as string;
    try {
        const bodyData = await prisma.body.findMany({
            where: { user_id: userId },
            orderBy: { recorded_at: "desc" },
        });
        res.status(200).json(bodyData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch body data" });
    }
};

export const getBodyDataById = async (req: Request, res: Response) => {
    const userId = req.user!.id as string
    try {
        const bodyData = await prisma.body.findFirst({
            where: { user_id: userId },
            orderBy: { recorded_at: "desc" }, // แถวล่าสุดของตัวเอง
        });
        if (!bodyData) {
            return res.status(404).json({ error: "Body data not found" });
        }
        res.status(200).json(bodyData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch body data" });
    }
}

export const createBody = async (req: Request, res: Response) => {
    const { weight, height, chest, waist, hips } = req.body;
    try {
        const newBody = await prisma.body.create({
            data: {
                user_id: req.user!.id,
                weight,
                height,
                chest,
                waist,
                hips,
            },
        });
        res.status(201).json(newBody);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create body data" });
    }
}

export const updateBody = async (req: Request, res: Response) => {
    const userId = req.user!.id as string; // id ของ User
    const bodyId = req.params.id as string // id ของแถว Body 
    const { weight, height, chest, waist, hips } = req.body;
    try {
        const updatedBody = await prisma.body.updateMany({
            where: { id: bodyId, user_id: userId }, //
            data: {
                weight,
                height,
                chest,
                waist,
                hips,
            },
        });
        if (updatedBody.count === 0) {
            return res.status(404).json({ error: "Body data not found" });
        }
        const updated = await prisma.body.findUnique({
            where: {
                id: bodyId
            }
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update body data" });
    }
}
export const deleteBody = async (req: Request, res: Response) => {
    const userId = req.user!.id as string;
    const bodyId = req.params.id as string;
    try {
        await prisma.body.deleteMany({
            where: {
                id: bodyId,
                user_id: userId
            },
        });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete body data" });
    }
}