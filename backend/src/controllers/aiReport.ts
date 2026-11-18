import type { Request, Response } from "express";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AiReportCategory, AiReportStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { s3 } from "../middlewares/upload";

// ตอนนี้รับเฉพาะเรื่อง "AI สร้างภาพผิดพลาด" — หมวดอื่นปิดไว้
const CATEGORIES: AiReportCategory[] = ["TRY_ON"];

const STATUSES: AiReportStatus[] = ["PENDING", "APPROVED", "REJECTED"];

// เว้นระยะกันส่งรายงานถี่เกินไป (มิลลิวินาที)
const REPORT_COOLDOWN_MS = 60 * 1000;

interface MulterS3File extends Express.Multer.File {
  key?: string;
  location?: string;
}

const REPORT_SELECT = {
  id: true,
  user_id: true,
  category: true,
  title: true,
  message: true,
  page_url: true,
  image_url: true,
  status: true,
  created_at: true,
} as const;

// ลบไฟล์ที่อัปโหลดไปแล้ว ในกรณี validation ไม่ผ่าน / เกิด error
const removeFromS3 = async (key?: string) => {
  if (!key) return;
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (err) {
    console.error("Failed to delete report screenshot, key:", key, err);
  }
};

// multer-s3 แนบ location มาให้ — ถ้าไม่มีให้ประกอบ URL เองจาก key
const screenshotUrl = (file: MulterS3File): string | null => {
  if (file.location) return file.location;
  if (!file.key) return null;
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`;
};

// ยื่นรายงานปัญหาการใช้ AI — POST /ai-reports (multipart/form-data, แนบภาพได้ 1 ไฟล์)
export const createAiReport = async (req: Request, res: Response) => {
  const user = req.user!;
  const file = req.file as MulterS3File | undefined;

  try {
    const body = req.body as {
      category?: unknown;
      title?: unknown;
      message?: unknown;
      page_url?: unknown;
    };

    const rawCategory =
      typeof body.category === "string" ? body.category.trim().toUpperCase() : "";
    if (!CATEGORIES.includes(rawCategory as AiReportCategory)) {
      await removeFromS3(file?.key);
      return res.status(400).json({
        error: "ตอนนี้รับแจ้งเฉพาะปัญหาภาพที่ AI สร้างผิดพลาด",
      });
    }
    const category = rawCategory as AiReportCategory;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 3 || title.length > 120) {
      await removeFromS3(file?.key);
      return res.status(400).json({
        error: "หัวข้อต้องมีความยาว 3–120 ตัวอักษร",
      });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 10 || message.length > 2000) {
      await removeFromS3(file?.key);
      return res.status(400).json({
        error: "รายละเอียดต้องมีความยาว 10–2000 ตัวอักษร",
      });
    }

    // page_url เป็น path ภายในเว็บเท่านั้น (กัน URL ภายนอก/ข้อมูลแปลกปลอม)
    let pageUrl: string | null = null;
    if (typeof body.page_url === "string" && body.page_url.trim().length > 0) {
      const candidate = body.page_url.trim();
      if (candidate.length > 500 || !candidate.startsWith("/") || /\s/.test(candidate)) {
        await removeFromS3(file?.key);
        return res.status(400).json({ error: "หน้าที่พบปัญหาไม่ถูกต้อง" });
      }
      pageUrl = candidate;
    }

    // กันสแปม: ส่งซ้ำภายใน 1 นาทีไม่ได้
    const recent = await prisma.aiReport.findFirst({
      where: {
        user_id: user.id,
        created_at: { gte: new Date(Date.now() - REPORT_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      await removeFromS3(file?.key);
      return res.status(429).json({
        error: "คุณเพิ่งส่งรายงานไปเมื่อสักครู่ กรุณารอสักครู่แล้วลองใหม่",
      });
    }

    const report = await prisma.aiReport.create({
      data: {
        user_id: user.id,
        category,
        title,
        message,
        page_url: pageUrl,
        image_url: file ? screenshotUrl(file) : null,
      },
      select: REPORT_SELECT,
    });

    return res.status(201).json({ report });
  } catch (error) {
    console.error(error);
    await removeFromS3(file?.key);
    return res.status(500).json({ error: "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่" });
  }
};

// ================= ฝั่ง Super Admin (auth ด้วย admin_token + requireSuperAdmin) =================

const ADMIN_REPORT_SELECT = {
  id: true,
  user_id: true,
  category: true,
  title: true,
  message: true,
  page_url: true,
  image_url: true,
  status: true,
  admin_note: true,
  handled_by: true,
  handled_at: true,
  created_at: true,
  updated_at: true,
} as const;

const keyFromUrl = (url: string): string | null => {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return null;
  }
};

// bucket เป็น private → แปลง image_url เป็น presigned URL ให้หน้า admin แสดงรูปได้
const withSignedImage = async <T extends { image_url: string | null }>(
  report: T
): Promise<T> => {
  if (!report.image_url) return report;
  const key = keyFromUrl(report.image_url);
  if (!key) return report;

  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      }),
      { expiresIn: 86400 }
    );
    return { ...report, image_url: url };
  } catch (err) {
    console.error("Failed to sign report screenshot:", err);
    return report;
  }
};

// รายการรายงานทั้งหมด (กรองตามสถานะได้) — GET /admin/ai-reports?status=PENDING
export const getAiReports = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };

    const where =
      typeof status === "string" &&
      (STATUSES as readonly string[]).includes(status)
        ? { status: status as AiReportStatus }
        : {};

    const reports = await prisma.aiReport.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        ...ADMIN_REPORT_SELECT,
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });

    const withImages = await Promise.all(
      reports.map((report) => withSignedImage(report))
    );

    return res.json(withImages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load AI reports" });
  }
};

// อัปเดตสถานะ/บันทึกของ Super Admin — PUT /admin/ai-reports/:id/status
// body: { status: "PENDING" | "APPROVED" | "REJECTED", admin_note?: string }
export const updateAiReportStatus = async (req: Request, res: Response) => {
  try {
    const admin = req.admin!;
    const id = req.params.id as string;
    const { status, admin_note } = req.body as {
      status?: string;
      admin_note?: string;
    };

    if (
      typeof status !== "string" ||
      !(STATUSES as readonly string[]).includes(status)
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const nextStatus = status as AiReportStatus;

    if (admin_note !== undefined && typeof admin_note !== "string") {
      return res.status(400).json({ error: "Invalid admin_note" });
    }
    if (typeof admin_note === "string" && admin_note.trim().length > 1000) {
      return res.status(400).json({ error: "บันทึกต้องไม่เกิน 1000 ตัวอักษร" });
    }
    const note =
      typeof admin_note === "string" && admin_note.trim().length > 0
        ? admin_note.trim()
        : undefined;

    const existing = await prisma.aiReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "AI report not found" });
    }

    const updated = await prisma.aiReport.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(note !== undefined ? { admin_note: note } : {}),
        // กลับไป PENDING = คืนเข้าคิว ยังไม่ถือว่ามีคนจัดการ
        handled_by: nextStatus === "PENDING" ? null : admin.id,
        handled_at: nextStatus === "PENDING" ? null : new Date(),
      },
      select: {
        ...ADMIN_REPORT_SELECT,
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });

    return res.json({ report: await withSignedImage(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update AI report" });
  }
};
