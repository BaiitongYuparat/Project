import { Type } from "@google/genai";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ai, GEMINI_MODEL } from "../../lib/gemini";
import { s3 } from "../middlewares/upload";

export const checkBodyImage = async (
    key: string,
    mimeType: string,
    angle: string
): Promise<{ status: "APPROVED" | "REJECTED"; reason: string }> => {
    const obj = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        })
    );
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
                required: [
                    "is_real_person",
                    "full_body_visible",
                    "angle_correct",
                    "clear_enough",
                    "reason",
                ],
            },
        },
    });

    const result = JSON.parse(response.text ?? "{}");
    const passed =
        result.is_real_person &&
        result.full_body_visible &&
        result.angle_correct &&
        result.clear_enough;

    return {
        status: passed ? "APPROVED" : "REJECTED",
        reason: result.reason as string,
    };
};