import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Type } from "@google/genai";
import { prisma } from "../../lib/prisma";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";
import { loadImageBase64 } from "../utils/imageUtils";
import { ImageView, ProductImageQualityStatus } from "@prisma/client";

type RecheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NOT_ALLOWED" | "UNSUPPORTED" | "TOO_SOON";
      /** วินาทีที่ต้องรออีก (เฉพาะ TOO_SOON) */
      retry_after?: number;
    };

// ข้อความ reason ที่หมายถึง "ระบบตรวจล้มเหลว" ไม่ใช่รูปไม่ผ่านจริง —
// ฝั่ง frontend ใช้แยกปุ่ม recheck (AI error) กับปุ่มแก้ไข (รูปไม่ผ่าน)
const SYSTEM_ERROR_REASONS = [
  "ระบบตรวจสอบภาพขัดข้อง กรุณาลองใหม่อีกครั้ง",
  "ระบบตรวจสอบภาพปิดให้บริการชั่วคราว",
] as const;

export const isQualitySystemError = (reason: string | null | undefined) =>
  !!reason && (SYSTEM_ERROR_REASONS as readonly string[]).includes(reason);

// เว้นระยะห่างระหว่างการกดตรวจซ้ำ (กัน spam เรียก AI)
export const RECHECK_COOLDOWN_MS = 30_000;

    
// ตรวจสอบคุณภาพรูปสินค้า

const checkProductImage = async (
  key: string,
  mimeType: string,
  view: "FRONT" | "BACK" | "LEFT" | "RIGHT"
) => {
  const data = await loadImageBase64(key);

  const viewDescriptions = {
    FRONT: "ด้านหน้า",
    BACK: "ด้านหลัง",
    LEFT: "ด้านซ้าย",
    RIGHT: "ด้านขวา",
  };

  const expectedView = viewDescriptions[view];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType, data } },
      {
        text: `
You are an AI image quality inspector for a Virtual Try-On application.
You will receive ONE clothing product photo and the view the seller CLAIMS it shows: ${expectedView} (${view}).

Evaluate the image against these criteria:

1. Product Visibility: Is the clothing item clearly visible as the main subject?
2. Product Completeness: Is the whole garment visible, without excessive cropping or obstruction?
3. Image Clarity: Is the image sharp, without significant blur?
4. Lighting: Is the lighting sufficient to see details, colors, and textures?
5. Virtual Try-On Suitability: Is the image suitable for an AI Virtual Try-On system?
6. View Verification: Does the image show the claimed view?

HOW TO DETERMINE THE VIEW
Before deciding, look for physical evidence on the garment. Do NOT guess.
Photos may show the garment flat, hanging, folded, on a mannequin, or worn by a person.
Being flat or having no model is NOT a reason to change your answer.

Pants / shorts / skirts:
- FRONT evidence: a fly (zipper or button placket) at the center, front pockets that open at the sides of the waist (slanted or curved), a flat front waistband, front pleats or darts, a front button or hook closure.
- BACK evidence: patch pockets or welt pockets on the buttocks, a back yoke seam (V-shaped or curved seam across the upper back), a curved center-back seam, no fly.
- If the garment is plain with no clear evidence (e.g. elastic-waist pants with no pockets), and nothing contradicts the claimed view, treat the claimed view as correct.
- A pair of pants with a visible fly or front pockets is FRONT. Do not call it BACK.

Tops / jackets / dresses:
- FRONT evidence: a lower neckline, a placket, buttons or a zipper down the center, front pockets, a chest logo or print.
- BACK evidence: a higher neckline, a back yoke seam, a back vent or slit, a hood hanging down, a back print, no placket.

Side views (LEFT / RIGHT):
- Judge by the garment being seen from the side (side seam in the center, profile silhouette).
- Do NOT fail only because you cannot tell left from right; the sides are often nearly symmetrical.

DECISION RULES FOR view_correct
- Set view_correct = false ONLY when you can point to clear, specific evidence that the photo shows a DIFFERENT view than the claimed one (for example, you clearly see back pockets and no fly when FRONT is claimed).
- If the evidence is ambiguous, weak, or the garment is symmetrical, set view_correct = true and set detected_view to the claimed view (${view}).
- Use detected_view = UNKNOWN only when the garment cannot be seen well enough at all.
- view_correct and detected_view must be consistent with each other.

OUTPUT
Return the inspection results in the specified JSON format.
All textual explanations, especially the "reason" field, MUST be written in Thai.
Keep the reason concise and explain why the image passed or failed.
If it failed because of the view, state the specific feature you saw (e.g. "พบกระเป๋าหลังและไม่มีซิป จึงเป็นด้านหลัง").
`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          product_visible: { type: Type.BOOLEAN },
          product_complete: { type: Type.BOOLEAN },
          clear_enough: { type: Type.BOOLEAN },
          well_lit: { type: Type.BOOLEAN },
          suitable_for_try_on: { type: Type.BOOLEAN },
          view_correct: { type: Type.BOOLEAN },
          detected_view: {
            type: Type.STRING,
            enum: ["FRONT", "BACK", "LEFT", "RIGHT", "UNKNOWN"],
          },
          reason: { type: Type.STRING },
        },
        required: [
          "product_visible",
          "product_complete",
          "clear_enough",
          "well_lit",
          "suitable_for_try_on",
          "view_correct",
          "detected_view",
          "reason",
        ],
      },
    },
  });

  const result = JSON.parse(response.text ?? "{}");

  const passed =
    result.product_visible === true &&
    result.product_complete === true &&
    result.clear_enough === true &&
    result.well_lit === true &&
    result.suitable_for_try_on === true &&
    result.view_correct === true &&
    result.detected_view === view;

  return {
    status: passed
      ? ProductImageQualityStatus.PASSED
      : ProductImageQualityStatus.FAILED,
    reason: result.reason as string,
  };
};


// ตรวจสอบรูปสินค้าและบันทึกผลลง Database
export const processProductImageQuality = async (params: {
  imageId: string;
  productId: string;
  key: string;
  mimeType: string;
  view: ImageView;
}) => {
  try {
    if (!isGeminiEnabled) {
      await prisma.productImage.updateMany({
        where: {
          id: params.imageId,
          product_id: params.productId,
          s3_key: params.key,
          quality_status: "PENDING",
        },
        data: {
          quality_status: "FAILED",
          quality_reason: SYSTEM_ERROR_REASONS[1],
          last_checked_at: new Date(),
        },
      });

      return;
    }

    const result = await checkProductImage(
      params.key,
      params.mimeType,
      params.view
    );


    const updated = await prisma.productImage.updateMany({
      where: {
        id: params.imageId,
        product_id: params.productId,
        s3_key: params.key,
        quality_status: "PENDING"
      },
      data: {
        quality_status:result.status === "PASSED" ? "PASSED" : "FAILED",
        quality_reason:(result.reason ?? "").toString().slice(0, 500) || null,
        last_checked_at: new Date(),
      },
    });

    console.log("Updated image count:", updated.count);

  } catch (error) {
     console.error("Quality check failed:", error);
     await prisma.productImage.updateMany({
      where: {
        id: params.imageId,
        product_id: params.productId,
        s3_key: params.key,
        quality_status: "PENDING",
      },
      data: {
        quality_status: "FAILED",
        quality_reason: SYSTEM_ERROR_REASONS[0],
        last_checked_at: new Date(),
      },
    });

     throw error;
  }
};

export const recheckProductImage = async (
  brandId: string,
  productId: string,
  imageId: string
): Promise<RecheckResult> => {

  // 1. ค้นหารูปภาพ โดยตรวจสอบว่าเป็นของร้านและสินค้านี้จริง
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      product_id: productId,
      product: {
        brand_id: brandId,
      },
    },
    select: {
      id: true,
      s3_key: true,
      view: true,
      quality_status: true,
      last_checked_at: true,
    },
  });

  if (!image) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  // 2. ตรวจสอบสถานะ
  if (image.quality_status !== "FAILED") {
    return { ok: false, reason: "NOT_ALLOWED" };
  }

  // 3. ตรวจสอบ cooldown — ตรวจล่าสุดไม่ถึง 30 วินาทีให้พักก่อน (กัน spam AI)
  const lastCheckedAt = image.last_checked_at?.getTime() ?? 0;
  const elapsed = Date.now() - lastCheckedAt;

  if (lastCheckedAt > 0 && elapsed < RECHECK_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "TOO_SOON",
      retry_after: Math.ceil((RECHECK_COOLDOWN_MS - elapsed) / 1000),
    };
  }

  // 4. ตรวจสอบประเภทไฟล์
  const extension = image.s3_key.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  const mimeType = extension ? mimeTypes[extension] : undefined;

  if (!mimeType) {
    return { ok: false, reason: "UNSUPPORTED" };
  }

  // 5. เปลี่ยนสถานะเป็น PENDING แบบ Atomic (พร้อมตรึงเวลา cooldown)
  const updated = await prisma.productImage.updateMany({
    where: {
      id: imageId,
      product_id: productId,
      quality_status: "FAILED",
    },
    data: {
      quality_status: "PENDING",
      quality_reason: null,
      last_checked_at: new Date(),
    },
  });



  // 6. เริ่ม AI ตรวจสอบแบบไม่ต้องรอผล
  void processProductImageQuality({
    imageId: image.id,
    productId,
    key: image.s3_key,
    mimeType,
    view: image.view,
  }).catch((error) => {
    console.error("Background recheck error:", error);
  });

  return { ok: true };
};