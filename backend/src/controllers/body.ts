import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";

export const getBodyData = async (req: Request, res: Response) => {
    try {
        const bodyData = await prisma.body.findMany();
        res.status(200).json(bodyData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch body data" });
    }
};

export const getBodyDataById = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const bodyData = await prisma.body.findUnique({
            where: { id: id },
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
    const { weight, height, chest, waist, hips, user_id } = req.body;
    try {
        const newBody = await prisma.body.create({
            data: {
                user_id: user_id,
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
    const id = req.params.id as string
    const { weight, height, chest, waist, hips } = req.body;
    try {
        const updatedBody = await prisma.body.update({
            where: { id: id },
            data: {
                weight,
                height,
                chest,
                waist,
                hips,
            },
        });
        res.status(200).json(updatedBody);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update body data" });
    }
}

export const deleteBody = async (req: Request, res: Response) => {
    const id = req.params.id as string
    try {
        await prisma.body.delete({
            where: { id: id },
        });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete body data" });
    }
}