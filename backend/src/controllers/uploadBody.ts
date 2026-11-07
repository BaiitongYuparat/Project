import { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { Type } from "@google/genai";
import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";
import { ai, GEMINI_MODEL, isGeminiEnabled } from "../../lib/gemini";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface MulterS3File extends Express.Multer.File {
    location: string;
    key: string;
}
// มุมตรงกับที่ Frontend ส่ง
const REQUIRED_ANGLES = ["front", "back", "left", "right"] as const;
type AngleType = (typeof REQUIRED_ANGLES)[number];

// ทำความสะอาด userId ให้ใช้เป็น path ใน S3 ได้ปลอดภัย ใช้ตรงนี้ที่เดียว ตรงกับ upload.ts เสมอ
const sanitizeUserId = (userId: string) =>
    String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, "");

// ลบไฟล์ออกจาก S3 ถ้าล้มเหลวแค่ log ไม่ทำให้ request พัง
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
// ลบหลายไฟล์พร้อมกัน
const removeMultipleFromS3 = async (keys: string[]) => {
    await Promise.all(keys.map((key) => removeFromS3(key)));
};
// แกะ path ของไฟล์จาก S3 URL รูปแบบ virtual-hosted ใช้กับ URL ที่ multer-s3 สร้างให้
const keyFromUrl = (url: string): string | null => {
    try {
        return decodeURIComponent(new URL(url).pathname.slice(1));
    } catch {
        return null;
    }
};

// ย้ายไฟล์จาก temp/ ไป body-images/ ด้วย Copy แล้ว Delete ถ้า Copy สำเร็จแต่ Delete ล้มเหลว: ไฟล์จะมีสองที่ชั่วคราว
const moveS3Object = async (
    tempKey: string,
    userId: string
): Promise<string> => {
    const sanitizedUserId = sanitizeUserId(userId);
    const ext = "." + tempKey.split(".").pop();
    const newKey = `body-images/${sanitizedUserId}/${Date.now()}_${Math.round(
        Math.random() * 1e9
    )}${ext}`;

    // คัดลอกไฟล์ไปที่ path ใหม่ก่อน
    await s3.send(
        new CopyObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            CopySource: encodeURI(
                `${process.env.AWS_S3_BUCKET_NAME!}/${tempKey}`
            ),
            Key: newKey,
        })
    );

    // ลบต้นทาง temp/ หลัง copy สำเร็จ
    await removeFromS3(tempKey);
    return newKey;
};

// Gemini Quality Check
// ดึงรูปจาก S3 แล้วส่งให้ Gemini ตรวจ คืนค่า APPROVED หรือ REJECTED พร้อมเหตุผล
const checkBodyImageWithGemini = async (
    key: string,
    mimeType: string,
    angle: string
): Promise<{ status: "APPROVED" | "REJECTED"; reason: string }> => {
    // ดึงรูปจาก S3 เป็น base64 เพื่อส่งให้ Gemini
    const obj = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        })
    );
    const bytes = await obj.Body!.transformToByteArray();
    const data = Buffer.from(bytes).toString("base64");

    // ส่งรูปและ prompt ไปให้ Gemini ตรวจ
    // ใช้ responseSchema บังคับให้ตอบ JSON โดยไม่ต้องตัด Markdown fence
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
            // บังคับให้ตอบเป็น JSON ตาม schema ด้านล่าง
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

    // ต้องผ่านทุกเงื่อนไขจึงจะ APPROVED
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

// POST /images/verify/:angle
// รับรูปทีละมุม อัปขึ้น temp/ ตรวจกับ Gemini
// ถ้าผ่านคืน tempKey กลับ ถ้าไม่ผ่านลบรูปและตอบ 422
export const verifyBodyImage = async (req: Request, res: Response) => {
    const file = req.file as MulterS3File | undefined;

    // ไม่มีไฟล์ ไม่มีอะไรต้องลบ
    if (!file) {
        return res.status(400).json({ message: "Please upload an image file" });
    }

    // ตรวจ user ก่อนทำอะไรทั้งหมด
    // ถ้าไม่มีต้องลบไฟล์ที่อัปขึ้น temp/ ไปแล้ว
    if (!req.user) {
        await removeFromS3(file.key);
        return res.status(401).json({ message: "Unauthorized" });
    }

    // อ่าน angle จาก URL param เช่น POST /images/verify/front
    const angle = String(req.params.angle);

    // ตรวจว่า angle ถูกต้อง ถ้าไม่ถูกลบไฟล์ทิ้ง
    if (!(REQUIRED_ANGLES as readonly string[]).includes(angle)) {
        await removeFromS3(file.key);
        return res.status(400).json({
            message: `angle must be one of: ${REQUIRED_ANGLES.join(", ")}`,
        });
    }
    try {
        // ถ้า Gemini ไม่ได้เปิด ให้คืน tempKey กลับโดยไม่ตรวจ ใช้สำหรับ development หรือเมื่อ GEMINI_API_KEY ไม่ได้ตั้งค่า
        if (!isGeminiEnabled) {
            return res.status(200).json({
                message: "Image uploaded (quality check skipped)",
                tempKey: file.key,
                angle,
            });
        }
        // ส่งรูปให้ Gemini ตรวจ
        const result = await checkBodyImageWithGemini(
            file.key,
            file.mimetype,
            angle
        );
        if (result.status === "REJECTED") {
            // ไม่ผ่าน ลบรูปจาก temp/ แล้วตอบ 422
            // ไม่ให้ Frontend ส่ง tempKey นี้ไป confirm ได้
            await removeFromS3(file.key);
            return res.status(422).json({
                message: "Image quality check failed",
                reason: result.reason,
                angle,
            });
        }

        // ผ่าน คืน tempKey กลับให้ Frontend เก็บไว้ Frontend จะรวม tempKeys ทั้ง 4 มุมแล้วส่งไป POST /images/body
        return res.status(200).json({
            message: "Image verified successfully",
            tempKey: file.key,
            angle,
        });
    } catch (error) {
        // Gemini หรือ S3 ล้มเหลว ลบรูปทิ้งและตอบ 500
        console.error("Error in verifyBodyImage:", error);
        await removeFromS3(file.key);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// รับ tempKeys ทั้ง 4 มุม ย้ายจาก temp/ ไป body-images/ แล้วบันทึก DB
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

    // ตรวจว่ามี tempKeys อย่างน้อย 1 มุม
    if (!tempKeys || Object.keys(tempKeys).length === 0) {
      return res.status(400).json({ message: "No images to save" });
    }

    // เอาเฉพาะมุมที่ส่ง tempKey มา
    const anglesToUpdate = REQUIRED_ANGLES.filter((a) => tempKeys[a]);

    // ตรวจ prefix และ path traversal เฉพาะมุมที่ส่งมา
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
    // กัน key ซ้ำ
    if (new Set(keyList).size !== keyList.length) {
      return res.status(400).json({ message: "Duplicate temp keys" });
    }
    // ตรวจสิทธิ์ body
    const userBody = await prisma.body.findFirst({
      where: { id: bodyId, user_id: userId },
    });
    if (!userBody) {
      await removeMultipleFromS3(keyList);
      return res.status(403).json({ message: "You do not have permission" });
    }

    const oldUrlsToDelete: string[] = [];
    const newKeys: string[] = [];
    // อัพเดตเฉพาะมุมที่ส่ง tempKey มา มุมอื่นคงรูปเดิม
    const savedImages = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const angle of anglesToUpdate) {
        const tempKey = tempKeys[angle] as string;
        const newKey = await moveS3Object(tempKey, userId);
        newKeys.push(newKey);

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
    }).catch(async (error) => {
      console.error("Transaction failed, cleaning up S3:", error);
      await removeMultipleFromS3(newKeys);
      throw error;
    });
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
// ดึงรูปที่บันทึกไว้แล้วพร้อม presigned URL presigned URL มีอายุ 24 ชั่วโมง
export const getBodyImages = async (req: Request, res: Response) => {
    // ตรวจ user ก่อนเข้า try เพื่อตอบ 401 ไม่ใช่ 500
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const userId = req.user.id;
        const bodyId = String(req.params.bodyId);
        // ตรวจว่า body นี้เป็นของ user จริง
        const userBody = await prisma.body.findFirst({
            where: { id: bodyId, user_id: userId },
        });
        if (!userBody) {
            return res.status(403).json({ message: "You do not have permission" });
        }
        // ดึงรูปทั้งหมดของ body นี้
        const images = await prisma.image.findMany({
            where: { body_id: bodyId },
        });
        // สร้าง presigned URL สำหรับแต่ละรูป ใช้ presigned URL แทน public URL เพราะ bucket เป็น private
        const imagesWithPresignedUrl = await Promise.all(
            images.map(async (img) => {
                const key = img.s3 ? keyFromUrl(img.s3) : null;
                // ถ้าหา key ไม่ได้ คืน img เดิมโดยไม่มี URL ใหม่
                if (!key) return { ...img };
                const presignedUrl = await getSignedUrl(
                    s3,
                    new GetObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME!,
                        Key: key,
                    }),
                    // หมดอายุใน 24 ชั่วโมง
                    { expiresIn: 86400 }
                );
                // แทนที่ s3 URL เดิมด้วย presigned URL
                return { ...img, s3: presignedUrl };
            })
        );
        return res.status(200).json({ data: imagesWithPresignedUrl });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};