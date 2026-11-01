import { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Type } from "@google/genai";
import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}

const REQUIRED_ANGLES = ["front", "back", "left", "right"] as const;
type AngleType = (typeof REQUIRED_ANGLES)[number];

// S3 Helpers

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

const removeMultipleFromS3 = async (keys: string[]) => {
    await Promise.all(keys.map((key) => removeFromS3(key)));
};

// แปลง S3 URL กลับเป็น key สำหรับลบไฟล์เก่า
const keyFromUrl = (url: string): string | null => {
    try {
        return decodeURIComponent(new URL(url).pathname.slice(1));
    } catch {
        return null;
    }
};

// Gemini Quality Check

interface QualityResult {
    passed: boolean;
    reason?: string;
}

// ดึงรูปจาก S3 แล้วส่งให้ Gemini ตรวจคุณภาพตามมุมที่กำหนด
const checkQualityWithGemini = async (
    s3Key: string,
    mimeType: string,
    angle: string
): Promise<QualityResult> => {
    try {
        const obj = await s3.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Key,
        }));
        const bytes = await obj.Body!.transformToByteArray();
        const data = Buffer.from(bytes).toString("base64");

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                { inlineData: { mimeType, data } },
                {
                    text:
                        `This photo is for a virtual try-on app and should show a person's ${angle} view. ` +
                        "Check: is it a real person, is the full body visible, is it the correct angle " +
                        "(front = facing camera, back = back to camera, left/right = side profile), " +
                        "and is it clear and well lit.",
                },
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        is_real_person: { type: Type.BOOLEAN },
                        full_body_visible: { type: Type.BOOLEAN },
                        angle_correct: { type: Type.BOOLEAN },
                        clear_enough: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING },
                    },
                    required: ["is_real_person", "full_body_visible", "angle_correct", "clear_enough", "reason"],
                },
            },
        });

        const result = JSON.parse(response.text ?? "{}");
        const passed =
            result.is_real_person &&
            result.full_body_visible &&
            result.angle_correct &&
            result.clear_enough;

        return { passed, reason: result.reason };
    } catch (error) {
        console.error(`Gemini quality check error for ${angle}:`, error);
        // fail-closed: ถ้า Gemini error ให้ reject ไว้ก่อน ไม่ปล่อยผ่านอัตโนมัติ
        return { passed: false, reason: "Quality check failed, please try again" };
    }
};

// Main Controller
export const uploadAndVerifyBodyImages = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: MulterS3File[] } | undefined;

    if (!files) {
        return res.status(400).json({ message: "Please upload image files" });
    }

    // เก็บ key ทั้งหมดไว้ก่อน เผื่อต้อง rollback ลบออกจาก S3
    const allUploadedKeys: string[] = [];
    Object.values(files).forEach((fileArray) => {
        fileArray.forEach((file) => allUploadedKeys.push(file.key));
    });

    if (!req.user) {
        await removeMultipleFromS3(allUploadedKeys);
        return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;

    try {
        const { body_id } = req.body;

        if (typeof body_id !== "string" || !body_id.trim()) {
            await removeMultipleFromS3(allUploadedKeys);
            return res.status(400).json({ message: "body_id is required" });
        }
        const bodyId = body_id.trim();

        // ตรวจว่าครบ 4 มุมหรือไม่
        const missingAngles = REQUIRED_ANGLES.filter((angle) => !files[angle] || !files[angle][0]);
        if (missingAngles.length > 0) {
            await removeMultipleFromS3(allUploadedKeys);
            return res.status(400).json({
                message: `Missing required angles: ${missingAngles.join(", ")}. Please upload all 4 angles (front, back, left, right).`,
            });
        }

        const angleFileList = REQUIRED_ANGLES.map((angle) => ({
            angle: angle as AngleType,
            file: files[angle][0],
        }));

        // ตรวจสิทธิ์ว่า body นี้เป็นของ user คนนี้จริงมั้ย
        const userBody = await prisma.body.findFirst({
            where: { id: bodyId, user_id: userId },
        });

        if (!userBody) {
            await removeMultipleFromS3(allUploadedKeys);
            return res.status(403).json({
                message: "You do not have permission to upload images for this body",
            });
        }

        // ตรวจคุณภาพรูปด้วย Gemini (ข้ามถ้า Gemini ปิดอยู่)
        let failedChecks: { angle: string; passed: boolean; reason?: string }[] = [];

        if (isGeminiEnabled) {
            const qualityChecks = await Promise.all(
                angleFileList.map(async (item) => {
                    const check = await checkQualityWithGemini(
                        item.file.key,
                        item.file.mimetype,
                        item.angle
                    );
                    return { angle: item.angle, passed: check.passed, reason: check.reason };
                })
            );
            failedChecks = qualityChecks.filter((c) => !c.passed);
        }

        if (failedChecks.length > 0) {
            await removeMultipleFromS3(allUploadedKeys);
            return res.status(422).json({
                message: "Image quality verification failed",
                errors: failedChecks,
            });
        }

        // บันทึกลง DB ด้วย transaction และลบรูปเก่าออกจาก S3 หลัง commit
        const oldUrlsToDelete: string[] = [];

        const savedImages = await prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of angleFileList) {
                const existing = await tx.image.findUnique({
                    where: { body_id_angle: { body_id: bodyId, angle: item.angle } },
                    select: { s3: true },
                });

                if (existing?.s3) oldUrlsToDelete.push(existing.s3);

                const savedImage = await tx.image.upsert({
                    where: { body_id_angle: { body_id: bodyId, angle: item.angle } },
                    update: { s3: item.file.location, quality_status: "APPROVED", uploaded_at: new Date() },
                    create: { body_id: bodyId, angle: item.angle, s3: item.file.location, quality_status: "APPROVED" },
                });

                results.push(savedImage);
            }

            return results;
        });

        // ลบไฟล์เก่าออกจาก S3 หลัง transaction สำเร็จ
        for (const oldUrl of oldUrlsToDelete) {
            const oldKey = keyFromUrl(oldUrl);
            if (oldKey && !allUploadedKeys.includes(oldKey)) {
                await removeFromS3(oldKey);
            }
        }

        return res.status(201).json({
            message: "Body images uploaded and verified successfully",
            data: savedImages,
        });
    } catch (error) {
        console.error("Error in uploadAndVerifyBodyImages:", error);
        await removeMultipleFromS3(allUploadedKeys);
        return res.status(500).json({ message: "Internal server error" });
    }
};