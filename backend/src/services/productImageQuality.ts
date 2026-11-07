import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Type } from "@google/genai";
import { prisma } from "../../lib/prisma";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";
import { loadImageBase64 } from "../utils/imageUtils";
import { ProductImageQualityStatus } from "@prisma/client";

// ตรวจสอบคุณภาพรูปสินค้า
const checkProductImage = async (
  key: string,
  mimeType: string
) => {
  const data = await loadImageBase64(key);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType, data } },
      {
        text:
          "This image is for a virtual try-on application. " +
          "Check whether the clothing or product is clearly visible, " +
          "the product is sufficiently complete, the image is sharp, " +
          "well-lit, and suitable for virtual try-on.",
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
          reason: { type: Type.STRING },
        },
        required: [
          "product_visible",
          "product_complete",
          "clear_enough",
          "well_lit",
          "suitable_for_try_on",
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
    result.suitable_for_try_on === true;

  return {
    status: passed ? ProductImageQualityStatus.PASSED : ProductImageQualityStatus.FAILED,
    reason: result.reason as string,
  };
};

// ตรวจสอบรูปสินค้าและบันทึกผลลง Database
export const processProductImageQuality = async (params: {
  imageId: string;
  productId: string;
  key: string;
  mimeType: string;
}) => {
  try {
    if (!isGeminiEnabled) {
      console.log("Gemini disabled, skip product image quality check");
      return;
    }

    const result = await checkProductImage(
      params.key,
      params.mimeType
    );

    await prisma.productImage.updateMany({
      where: {
        id: params.imageId,
        product_id: params.productId,
        s3_key: params.key,
      },
      data: {
        quality_status: result.status,
        quality_reason: result.reason,
      },
    });

    console.log(
      `Product image quality check ${params.imageId}: ${result.status}`
    );
  } catch (error) {
    console.error(
      "Product image quality check failed, status stays PENDING:",
      error
    );
  }
};