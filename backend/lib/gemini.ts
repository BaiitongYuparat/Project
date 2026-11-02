import { GoogleGenAI } from "@google/genai";

export const isGeminiEnabled = Boolean(process.env.GEMINI_API_KEY);

if (!isGeminiEnabled) {
    console.warn("GEMINI_API_KEY is not set, AI features are disabled");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";