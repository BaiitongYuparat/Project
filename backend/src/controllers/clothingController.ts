import { Request, Response } from "express";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}

const ALLOWED_CATEGORIES = ["top", "bottom", "dress", "outerwear"];

// ลบไฟล์ออกจาก S3 เมื่อ validate หรือบันทึก DB ไม่ผ่าน
const removeFromS3 = async (key: string) => {
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        }));
    } catch (err) {
        console.error("Failed to delete S3 object, key:", key, err);
    }
};

// POST /api/clothings  (form-data: image, category, name)
export const createClothing = async (
    req: Request,
    res: Response
) => {

    const file = req.file as MulterS3File | undefined;

    if (!file) {
        return res.status(400).json({ message: "Please upload an image file" });
    }

    try {
        const userId = req.user!.id;
        const { category, name } = req.body;

        // 1. ตรวจ category
        if (typeof category !== "string" || !ALLOWED_CATEGORIES.includes(category)) {
            await removeFromS3(file.key);
            return res.status(400).json({
                message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
            });
        }

        // 2. บันทึกลงฐานข้อมูล (name ไม่บังคับ)
        const clothing = await prisma.clothing.create({
            data: {
                user_id: userId,
                category,
                name: typeof name === "string" && name.trim() ? name.trim() : null,
                image_url: file.location,
            },
        });

        return res.status(201).json({
            message: "Clothing created successfully",
            data: clothing,
        });
    } catch (error) {
        console.error(error);
        await removeFromS3(file.key);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/clothings  (ดึงเฉพาะของผู้ใช้ที่ล็อกอินอยู่)
export const getClothings = async (
    req: Request,
    res: Response
) => {

    try {
        const clothings = await prisma.clothing.findMany({
            where: { user_id: req.user!.id },
            orderBy: { created_at: "desc" },
        });

        return res.status(200).json({
            message: "Clothings fetched successfully",
            data: clothings,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};