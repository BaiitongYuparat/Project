import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Type } from "@google/genai";
import { prisma } from "../../lib/prisma";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";
import { s3 } from "../middlewares/upload";

// ดึงรูปจาก S3 แล้วแปลงเป็น base64
const loadImageBase64 = async (key: string): Promise<string> => {
    const obj = await s3.send(new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
    }));
    const bytes = await obj.Body!.transformToByteArray();

    return Buffer.from(bytes).toString("base64");
};

// ส่งรูปให้ Gemini ตรวจ แล้วสรุปเป็น APPROVED / REJECTED
const checkBodyImage = async (key: string, mimeType: string, angle: string) => {
    const data = await loadImageBase64(key);

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

    return { status: passed ? "APPROVED" : "REJECTED", reason: result.reason as string };
};

// เรียกหลังบันทึกรูปแล้ว ทำงานเบื้องหลัง ถ้าล้มเหลวคงสถานะ PENDING ไว้
export const processBodyImageQuality = async (params: {
    imageId: string;
    location: string;
    key: string;
    mimeType: string;
    angle: string;
    userId: string;
}) => {
    try {
        if (!isGeminiEnabled) {
            console.log("Gemini disabled, skip quality check");
            return;
        }

        // ตรวจ consent ai_processing ก่อนส่งรูปให้บุคคลที่สาม
        const consent = await prisma.userConsent.findFirst({
            where: {
                user_id: params.userId,
                type: "ai_processing",
                granted: true,
                revoked_at: null,
            },
        });

        if (!consent) {
            console.log(`No ai_processing consent for user ${params.userId}, skip`);
            return;
        }

        const result = await checkBodyImage(params.key, params.mimeType, params.angle);

        // ใช้ updateMany + เช็ก s3 ด้วย เพื่อกันทับสถานะรูปใหม่ถ้าผู้ใช้อัปโหลดทับระหว่างรอ
        await prisma.image.updateMany({
            where: { id: params.imageId, s3: params.location },
            data: { quality_status: result.status },
        });

        console.log(`Quality check ${params.imageId}: ${result.status} — ${result.reason}`);
    } catch (error) {
        console.error("Quality check failed, status stays PENDING:", error);
    }
};