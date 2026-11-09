import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { analyzeBodyType } from "../services/bodyTypeService";

// ────────────────────────────────────────────
// GET /body-type
// ดึงผล body type ที่วิเคราะห์ไว้แล้ว
// ────────────────────────────────────────────
export const getBodyType = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const bodyType = await prisma.bodyType.findUnique({
            where: { user_id: userId },
        });

        if (!bodyType) {
            return res.status(404).json({ message: "Body type not found" });
        }

        return res.status(200).json({ data: bodyType });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ────────────────────────────────────────────
// POST /body-type/analyze
// วิเคราะห์ body type จากสัดส่วนล่าสุดของ user
// ────────────────────────────────────────────
export const analyzeAndSaveBodyType = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        // ดึงข้อมูลสัดส่วนล่าสุด
        const body = await prisma.body.findFirst({
            where: { user_id: userId },
            orderBy: { recorded_at: "desc" },
        });

        if (!body) {
            return res.status(404).json({ message: "Body data not found, please fill in your measurements first" });
        }

        // ตรวจสอบว่าข้อมูลครบ
        if (!body.height || !body.weight || !body.chest || !body.waist || !body.hips) {
            return res.status(400).json({ message: "Incomplete body measurements, please fill in all fields" });
        }
   
        const user = await prisma.user.findUnique({
             where: { id: userId },
            select: { gender: true },
        })
           
        // วิเคราะห์ด้วย Gemini
        const result = await analyzeBodyType({
            height: Number(body.height),
            weight: Number(body.weight),
            chest: Number(body.chest),
            waist: Number(body.waist),
            hips: Number(body.hips),
            gender: user?.gender ?? "UNSPECIFIED",
        });

        // upsert ลง DB (1 user = 1 record)
        const bodyType = await prisma.bodyType.upsert({
            where: { user_id: userId },
            update: {
                body_type: result.body_type,
                description: result.description,
                analyzed_at: new Date(),
            },
            create: {
                user_id: userId,
                body_type: result.body_type,
                description: result.description,
            },
        });

        return res.status(200).json({ data: bodyType });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ────────────────────────────────────────────
// background trigger หลัง createBody / updateBody
// ไม่ต้องรอผล ไม่ throw error ให้ caller
// ────────────────────────────────────────────
export const triggerBodyTypeAnalysis = async (userId: string) => {
    try {
        const body = await prisma.body.findFirst({
            where: { user_id: userId },
            orderBy: { recorded_at: "desc" },
        });

        if (!body?.height || !body?.weight || !body?.chest || !body?.waist || !body?.hips) {
            return;
        }

        const result = await analyzeBodyType({
            height: Number(body.height),
            weight: Number(body.weight),
            chest: Number(body.chest),
            waist: Number(body.waist),
            hips: Number(body.hips),
        });

        await prisma.bodyType.upsert({
            where: { user_id: userId },
            update: {
                body_type: result.body_type,
                description: result.description,
                analyzed_at: new Date(),
            },
            create: {
                user_id: userId,
                body_type: result.body_type,
                description: result.description,
            },
        });

        console.log(`Body type analyzed for user ${userId}: ${result.body_type}`);
    } catch (error) {
        console.error(`Body type analysis failed for user ${userId}:`, error);
    }
};