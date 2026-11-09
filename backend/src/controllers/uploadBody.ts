import { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";
import { isGeminiEnabled } from "../../lib/gemini";
import { checkBodyImage } from "../services/geminiService";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}

const REQUIRED_ANGLES = ["front", "back", "left", "right"] as const;
type AngleType = (typeof REQUIRED_ANGLES)[number];

const sanitizeUserId = (userId: string) =>
    String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, "");

const removeFromS3 = async (key: string) => {
    try {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME!,
                Key: key,
            })
        );
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

const moveS3Object = async (
    tempKey: string,
    userId: string
): Promise<string> => {
    const sanitizedUserId = sanitizeUserId(userId);
    const ext = "." + tempKey.split(".").pop();
    const newKey = `body-images/${sanitizedUserId}/${Date.now()}_${Math.round(
        Math.random() * 1e9
    )}${ext}`;

    await s3.send(
        new CopyObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            CopySource: encodeURI(
                `${process.env.AWS_S3_BUCKET_NAME!}/${tempKey}`
            ),
            Key: newKey,
        })
    );

    await removeFromS3(tempKey);
    return newKey;
};

export const verifyBodyImage = async (req: Request, res: Response) => {
    const file = req.file as MulterS3File | undefined;

    if (!file) {
        return res.status(400).json({ message: "Please upload an image file" });
    }

    if (!req.user) {
        await removeFromS3(file.key);
        return res.status(401).json({ message: "Unauthorized" });
    }

    const angle = String(req.params.angle);

    if (!(REQUIRED_ANGLES as readonly string[]).includes(angle)) {
        await removeFromS3(file.key);
        return res.status(400).json({
            message: `angle must be one of: ${REQUIRED_ANGLES.join(", ")}`,
        });
    }

    try {
        if (!isGeminiEnabled) {
            return res.status(200).json({
                message: "Image uploaded (quality check skipped)",
                tempKey: file.key,
                angle,
            });
        }

        // เรียก checkBodyImage จาก geminiService แทน
        const result = await checkBodyImage(file.key, file.mimetype, angle);

        if (result.status === "REJECTED") {
            await removeFromS3(file.key);
            return res.status(422).json({
                message: "Image quality check failed",
                reason: result.reason,
                angle,
            });
        }

        return res.status(200).json({
            message: "Image verified successfully",
            tempKey: file.key,
            angle,
        });
    } catch (error) {
        console.error("Error in verifyBodyImage:", error);
        await removeFromS3(file.key);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const confirmBodyImages = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;

    try {
        const { body_id, tempKeys } = req.body;

        if (typeof body_id !== "string" || !body_id.trim()) {
            return res.status(400).json({ message: "body_id is required" });
        }
        const bodyId = body_id.trim();

        if (!tempKeys || Object.keys(tempKeys).length === 0) {
            return res.status(400).json({ message: "No images to save" });
        }

        const anglesToUpdate = REQUIRED_ANGLES.filter((a) => tempKeys[a]);
        const prefix = `temp/${sanitizeUserId(userId)}/`;
        const keyList = anglesToUpdate.map((a) => tempKeys[a]);

        const invalid = keyList.some(
            (k) =>
                typeof k !== "string" ||
                !k.startsWith(prefix) ||
                k.includes("..")
        );
        if (invalid) {
            return res.status(400).json({ message: "Invalid temp keys" });
        }

        if (new Set(keyList).size !== keyList.length) {
            return res.status(400).json({ message: "Duplicate temp keys" });
        }

        const userBody = await prisma.body.findFirst({
            where: { id: bodyId, user_id: userId },
        });

        if (!userBody) {
            await removeMultipleFromS3(keyList);
            return res.status(403).json({ message: "You do not have permission" });
        }

        // ย้ายไฟล์ใน S3 ก่อน ทำนอก transaction
        const movedKeys: Partial<Record<AngleType, string>> = {};
        const newKeys: string[] = [];

        try {
            for (const angle of anglesToUpdate) {
                const tempKey = tempKeys[angle] as string;
                const newKey = await moveS3Object(tempKey, userId);
                movedKeys[angle] = newKey;
                newKeys.push(newKey);
            }
        } catch (s3Error) {
            // S3 copy ล้มเหลว → ลบ newKeys ที่ copy ไปแล้ว
            console.error("S3 move failed:", s3Error);
            await removeMultipleFromS3(newKeys);
            return res.status(500).json({ message: "Failed to process images" });
        }

        //  บันทึก DB ใน transaction (เร็ว ไม่มี S3 call)
        const oldUrlsToDelete: string[] = [];

        let savedImages;
        try {
            savedImages = await prisma.$transaction(async (tx) => {
                const results = [];

                for (const angle of anglesToUpdate) {
                    const newKey = movedKeys[angle]!;
                    const newUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newKey}`;

                    const existing = await tx.image.findUnique({
                        where: { body_id_angle: { body_id: bodyId, angle } },
                        select: { s3: true },
                    });
                    if (existing?.s3) oldUrlsToDelete.push(existing.s3);

                    const saved = await tx.image.upsert({
                        where: { body_id_angle: { body_id: bodyId, angle } },
                        update: { s3: newUrl, quality_status: "APPROVED", uploaded_at: new Date() },
                        create: { body_id: bodyId, angle, s3: newUrl, quality_status: "APPROVED" },
                    });

                    results.push(saved);
                }
                return results;
            });
        } catch (dbError) {
            // DB ล้มเหลว → ลบ newKeys ที่ copy ไปแล้ว
            console.error("DB transaction failed, cleaning up S3:", dbError);
            await removeMultipleFromS3(newKeys);
            return res.status(500).json({ message: "Failed to save images" });
        }

        // ลบรูปเก่าหลัง DB สำเร็จ
        for (const oldUrl of oldUrlsToDelete) {
            const oldKey = keyFromUrl(oldUrl);
            if (oldKey && !newKeys.includes(oldKey)) {
                await removeFromS3(oldKey);
            }
        }

        return res.status(201).json({
            message: "Body images saved successfully",
            data: savedImages,
        });
    } catch (error) {
        console.error("Error in confirmBodyImages:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
export const getBodyImages = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const userId = req.user.id;
        const bodyId = String(req.params.bodyId);

        const userBody = await prisma.body.findFirst({
            where: { id: bodyId, user_id: userId },
        });

        if (!userBody) {
            return res.status(403).json({ message: "You do not have permission" });
        }

        const images = await prisma.image.findMany({
            where: { body_id: bodyId },
        });

        const imagesWithPresignedUrl = await Promise.all(
            images.map(async (img) => {
                const key = img.s3 ? keyFromUrl(img.s3) : null;
                if (!key) return { ...img };

                const presignedUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME!,
                        Key: key,
                    }),
                    { expiresIn: 86400 }
                );

                return { ...img, s3: presignedUrl };
            })
        );

        return res.status(200).json({ data: imagesWithPresignedUrl });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};