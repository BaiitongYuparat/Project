import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export const getModels = async (req: Request, res: Response) => {
  try {
    const models = await prisma.model.findMany({
      select: {
        id: true,
        name: true,
        gender: true,
        body_type: true,
        height: true,
        image_url: true,
        supported_sizes: true,
        is_active: true,
        is_selectable: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
    res.status(200).json(models);
  } catch (error) {
    console.error("getModels error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

