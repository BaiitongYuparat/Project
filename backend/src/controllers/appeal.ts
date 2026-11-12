import { prisma } from "../../lib/prisma";
import type { Request, Response } from "express";
import { sendAppealDecisionEmail } from "../services/emailService";
import type { AppealStatus } from "@prisma/client";

// ================= ฝั่ง shopper (auth ด้วย appeal_token — บัญชีที่ถูกระงับ) =================

const APPEAL_SELECT = {
  id: true,
  user_id: true,
  title: true,
  message: true,
  status: true,
  admin_note: true,
  decided_by: true,
  decided_at: true,
  created_at: true,
  updated_at: true,
} as const;

// ยื่นคำร้องขอปลดระงับบัญชี — POST /appeals
export const submitAppeal = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { title, message } = req.body as { title?: string; message?: string };

    if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 120) {
      return res.status(400).json({
        error: "หัวข้อต้องมีความยาว 3–120 ตัวอักษร",
      });
    }
    if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 2000) {
      return res.status(400).json({
        error: "รายละเอียดต้องมีความยาว 10–2000 ตัวอักษร",
      });
    }

    // ยื่นได้เฉพาะบัญชีที่ถูกระงับเท่านั้น
    if (user.status !== "suspended") {
      return res.status(403).json({
        error: "บัญชีของคุณไม่ได้อยู่ในสถานะถูกระงับ",
      });
    }

    // 1 บัญชีมีคำร้องที่รอพิจารณาได้ครั้งละ 1
    const pending = await prisma.appeal.findFirst({
      where: { user_id: user.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      return res.status(409).json({
        error: "คุณมีคำร้องที่กำลังรอพิจารณาอยู่แล้ว โปรดรอผู้ดูแลตรวจสอบ",
      });
    }

    const appeal = await prisma.appeal.create({
      data: {
        user_id: user.id,
        title: title.trim(),
        message: message.trim(),
      },
      select: APPEAL_SELECT,
    });

    return res.status(201).json({ appeal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to submit appeal" });
  }
};

// ดูคำร้องของตัวเอง (ล่าสุดก่อน) — GET /appeals/mine
export const getMyAppeals = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const appeals = await prisma.appeal.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      select: APPEAL_SELECT,
    });

    return res.json({ appeals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load appeals" });
  }
};

// ================= ฝั่ง Super Admin (auth ด้วย admin_token + requireSuperAdmin) =================

// รายการคำร้องทั้งหมด (กรองตามสถานะได้) — GET /admin/appeals?status=PENDING
export const getAppeals = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };

    const where =
      status === "PENDING" || status === "APPROVED" || status === "REJECTED"
        ? { status: status as AppealStatus }
        : {};

    const appeals = await prisma.appeal.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, status: true },
        },
      },
    });

    return res.json(appeals);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load appeals" });
  }
};

// ตัดสินคำร้อง — POST /admin/appeals/:id/decision
// body: { decision: "APPROVED" | "REJECTED", admin_note?: string }
// APPROVED → ปลดระงับบัญชีผู้ยื่นอัตโนมัติ (transaction เดียว) + ส่งอีเมลแจ้งผล
export const decideAppeal = async (req: Request, res: Response) => {
  try {
    const admin = req.admin!;
    const id = req.params.id as string;
    const { decision, admin_note } = req.body as {
      decision?: string;
      admin_note?: string;
    };

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return res.status(400).json({ error: "Invalid decision" });
    }
    const note =
      typeof admin_note === "string" && admin_note.trim().length > 0
        ? admin_note.trim()
        : null;
    if (decision === "REJECTED" && !note) {
      return res.status(400).json({
        error: "กรุณาระบุเหตุผลในการปฏิเสธ (admin_note)",
      });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
    if (!appeal) return res.status(404).json({ error: "Appeal not found" });
    if (appeal.status !== "PENDING") {
      return res.status(409).json({ error: "คำร้องนี้ถูกพิจารณาไปแล้ว" });
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appeal.update({
        where: { id },
        data: {
          status: decision,
          admin_note: note,
          decided_by: admin.id,
          decided_at: now,
        },
        select: APPEAL_SELECT,
      });

      if (decision === "APPROVED") {
        await tx.user.update({
          where: { id: appeal.user_id },
          data: { status: "active" },
        });
      }

      return result;
    });

    // แจ้งผลทางอีเมล (best-effort — ล้มเหลวไม่กระทบผลการตัดสิน)
    if (appeal.user.email) {
      await sendAppealDecisionEmail({
        to: appeal.user.email,
        name: appeal.user.name,
        decision,
        adminNote: note,
      });
    }

    return res.json({ appeal: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to decide appeal" });
  }
};
