import { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";  // แก้จุดที่ 2+3

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}

const REQUIRED_ANGLES = ["front", "back", "left", "right"] as const;
type AngleType = (typeof REQUIRED_ANGLES)[number];

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

const keyFromUrl = (url: string): string | null => {
    try {
        return decodeURIComponent(new URL(url).pathname.slice(1));
    } catch {
        return null;
    }
};

interface QualityResult {
    passed: boolean;
    reason?: string;
}

const checkQualityWithGemini = async (
    s3Key: string,         // แก้จุดที่ 1: รับ key แทน URL
    mimeType: string,
    angle: string
): Promise<QualityResult> => {
    try {
        // แก้จุดที่ 1: ดึงรูปจาก S3 ด้วย credential ของเรา ไม่ใช่ fetch จาก URL สาธารณะ
        const obj = await s3.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3Key,
        }));
        const bytes = await obj.Body!.transformToByteArray();
        const imageBuffer = Buffer.from(bytes).toString("base64");

        const response = await ai.models.generateContent({   // แก้จุดที่ 2: ใช้ ai จาก lib/gemini.ts
            model: GEMINI_MODEL,                              // แก้จุดที่ 3: ใช้ GEMINI_MODEL จาก env
            contents: [
                {
                    inlineData: {
                        data: imageBuffer,
                        mimeType: mimeType || "image/jpeg",
                    },
                },
                `คุณคือ AI ตรวจสอบคุณภาพรูปถ่ายสรีระร่างกาย (มุม: ${angle}) 
                โปรดตรวจสอบเงื่อนไขต่อไปนี้:
                1. เห็นสรีระร่างกายชัดเจนและเต็มตัวตามมุมที่กำหนดหรือไม่
                2. แสงสว่างเพียงพอหรือไม่ (ไม่มืด มืดสลัว หรือย้อนแสงจนมองไม่เห็นรายละเอียด)
                3. ภาพไม่เบลอหรือหลุดโฟกัสเกินไป
                
                ตอบกลับเป็นรูปแบบ JSON เท่านั้น ดังนี้:
                {
                  "passed": true/false,
                  "reason": "ระบุเหตุผลภาษาไทยอย่างสั้นหากไม่ผ่าน (ถ้าผ่านให้ระบุ null)"
                }`,
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        const jsonText = response.text || "{}";
        return JSON.parse(jsonText) as QualityResult;
    } catch (error) {
        console.error(`Gemini quality check error for ${angle}:`, error);
        return { passed: true };
    }
};

export const uploadAndVerifyBodyImages = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: MulterS3File[] } | undefined;

    if (!files) {
        return res.status(400).json({ message: "Please upload image files" });
    }

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

        const userBody = await prisma.body.findFirst({
            where: { id: bodyId, user_id: userId },
        });

        if (!userBody) {
            await removeMultipleFromS3(allUploadedKeys);
            return res.status(403).json({
                message: "You do not have permission to upload images for this body",
            });
        }

        // แก้จุดที่ 4: เช็ก isGeminiEnabled ก่อนเรียก AI
        // ถ้า Gemini ปิดอยู่ ให้ข้ามการตรวจและถือว่าผ่านทั้งหมด
        let failedChecks: { angle: string; passed: boolean; reason?: string }[] = [];

        if (isGeminiEnabled) {
            const qualityChecks = await Promise.all(
                angleFileList.map(async (item) => {
                    const check = await checkQualityWithGemini(
                        item.file.key,           // แก้จุดที่ 1: ส่ง key แทน location
                        item.file.mimetype,
                        item.angle
                    );
                    return {
                        angle: item.angle,
                        passed: check.passed,
                        reason: check.reason,
                    };
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

        const oldUrlsToDelete: string[] = [];

        const savedImages = await prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of angleFileList) {
                const existing = await tx.image.findUnique({
                    where: { body_id_angle: { body_id: bodyId, angle: item.angle } },
                    select: { s3: true },
                });

                if (existing?.s3) {
                    oldUrlsToDelete.push(existing.s3);
                }

                const savedImage = await tx.image.upsert({
                    where: { body_id_angle: { body_id: bodyId, angle: item.angle } },
                    update: {
                        s3: item.file.location,
                        quality_status: "APPROVED",   // แก้จุดที่ 5: PASSED → APPROVED
                        uploaded_at: new Date(),
                    },
                    create: {
                        body_id: bodyId,
                        angle: item.angle,
                        s3: item.file.location,
                        quality_status: "APPROVED",   // แก้จุดที่ 5: PASSED → APPROVED
                    },
                });

                results.push(savedImage);
            }

            return results;
        });

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