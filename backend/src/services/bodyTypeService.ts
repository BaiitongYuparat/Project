import { Type } from "@google/genai";
import { ai, GEMINI_MODEL } from "../../lib/gemini";

interface BodyMeasurements {
    height: number;
    weight: number;
    chest: number;
    waist: number;
    hips: number;
    gender?: string;
}

export const analyzeBodyType = async (
    measurements: BodyMeasurements
): Promise<{ body_type: string; description: string }> => {
    const { height, weight, chest, waist, hips, gender } = measurements;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
            {
                text:
                    `Analyze the body type based on these measurements:\n` +
                    `- Height: ${height} cm\n` +
                    `- Weight: ${weight} kg\n` +
                    `- Chest: ${chest} inches\n` +
                    `- Waist: ${waist} inches\n` +
                    `- Hips: ${hips} inches\n` +
                    `- Gender: ${gender ?? "unspecified"}\n\n` +
                    `For FEMALE: classify as hourglass, pear, apple, rectangle, or inverted_triangle.\n` +
                    `For MALE: classify as rectangle, inverted_triangle, oval, or trapezoid.\n` +
                    `For UNSPECIFIED: use universal classification.\n` +
                    `Focus mainly on chest/waist/hips ratio to determine body type.\n` +
                    `Provide a short description in Thai explaining the body type characteristics and clothing recommendations.`,
            },
        ],
        config: {
            responseMimeType: "application/json",
            temperature: 0,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    body_type: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
                required: ["body_type", "description"],
            },
        },
    });

    const result = JSON.parse(response.text ?? "{}");
    return {
        body_type: result.body_type as string,
        description: result.description as string,
    };
};