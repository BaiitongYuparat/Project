import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { OwnerTransferRequestStatus } from "@prisma/client";
import { invalidateBrandAccess } from "../utils/accessCache";

//===================== ฝั่ง Shop Admin (auth: adminAuthMiddleware + requireBrandAccess) =====================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const OWNER_TRANSFER_REQUEST_SELECT = {
  id: true,
  brand_id: true,
  current_owner_member_id: true,
  current_owner_email: true,
  new_owner_email: true,
  status: true,
  requested_by: true,
  decided_by: true,
  decided_at: true,
  created_at: true,
} as const;

// GET: ดึงคำขอเปลี่ยน OWNER ล่าสุดของร้าน (ไว้โชว์สถานะ "รอ Super Admin อนุมัติ" ในหน้า Admin Management)
// GET /brands/:slug/members/owner-transfer
export const getOwnerTransferRequestStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    const request = await prisma.ownerTransferRequest.findFirst({
      where: { brand_id: brandId },
      orderBy: { created_at: "desc" },
      select: OWNER_TRANSFER_REQUEST_SELECT,
    });

    return res.status(200).json({ request });

  } catch (error) {
    console.error("getOwnerTransferRequestStatus error:", error);

    return res.status(500).json({
      message: "Failed to fetch owner transfer request",
    });
  }
};

// POST: ยื่นคำขอเปลี่ยน OWNER — เฉพาะ OWNER ปัจจุบันเท่านั้น
// ระบุอีเมลใหม่ที่จะเป็น OWNER (อีเมลใดก็ได้ ถ้ายังไม่ใช่สมาชิกจะถูก upsert ตอน Super Admin อนุมัติ)
// เมื่ออนุมัติ: อีเมลใหม่เป็น OWNER และ owner ผู้ยื่นเดิมถูกเปลี่ยนเป็น ADMIN
// POST /brands/:slug/members/owner-transfer
export const requestOwnerTransfer = async (req: Request, res: Response) => {
  try {
    const brandId = req.brand?.id;
    const currentRole = req.brand?.role;
    const currentAdmin = req.admin;
    const { email } = req.body as { email?: string };

    if (!brandId || !currentAdmin) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    // ยื่นคำขอได้เฉพาะ OWNER ปัจจุบันเท่านั้น [REQ]
    if (currentRole !== "OWNER") {
      return res.status(403).json({
        message: "Only the brand OWNER can request an ownership transfer",
      });
    }

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({
        message: "A valid email is required",
      });
    }

    const newOwnerEmail = normalizeEmail(email);

    // ค้นหา BrandMember ของ owner ผู้ยื่น (ต้องยังเป็น OWNER ของร้านนี้)
    const ownerMember = await prisma.brandMember.findFirst({
      where: {
        brand_id: brandId,
        admin_id: currentAdmin.id,
        role: "OWNER",
      },
      select: {
        id: true,
        admin: {
          select: { email: true },
        },
      },
    });

    if (!ownerMember) {
      return res.status(403).json({
        message: "Only the brand OWNER can request an ownership transfer",
      });
    }

    // ห้ามโอนให้ตัวเอง
    if (ownerMember.admin.email && newOwnerEmail === normalizeEmail(ownerMember.admin.email)) {
      return res.status(400).json({
        message: "New owner email must be different from the current owner email",
      });
    }

    // ร้านมีคำขอ PENDING ได้ครั้งละ 1
    const pendingRequest = await prisma.ownerTransferRequest.findFirst({
      where: {
        brand_id: brandId,
        status: OwnerTransferRequestStatus.PENDING,
      },
      select: { id: true },
    });

    if (pendingRequest) {
      return res.status(409).json({
        message: "This brand already has a pending ownership transfer request",
      });
    }

    const request = await prisma.ownerTransferRequest.create({
      data: {
        brand_id: brandId,
        current_owner_member_id: ownerMember.id,
        current_owner_email: ownerMember.admin.email ?? "",
        new_owner_email: newOwnerEmail,
        status: OwnerTransferRequestStatus.PENDING,
        requested_by: currentAdmin.id,
      },
      select: OWNER_TRANSFER_REQUEST_SELECT,
    });

    return res.status(201).json({
      message: "Ownership transfer request submitted. Waiting for Super Admin approval",
      request,
    });

  } catch (error) {
    console.error("requestOwnerTransfer error:", error);

    return res.status(500).json({
      message: "Failed to submit ownership transfer request",
    });
  }
};

//===================== ฝั่ง Super Admin (auth: adminAuthMiddleware + requireSuperAdmin) =====================

// GET: รายการคำขอเปลี่ยน OWNER ทั้งหมด (กรองตามสถานะได้)
// GET /admin/owner-transfer-requests?status=PENDING
export const getOwnerTransferRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const { status } = req.query as { status?: string };

    const where =
      status === "PENDING" ||
      status === "APPROVED" ||
      status === "REJECTED"
        ? { status: status as OwnerTransferRequestStatus }
        : {};

    const requests = await prisma.ownerTransferRequest.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        ...OWNER_TRANSFER_REQUEST_SELECT,
        brand: {
          select: {
            id: true,
            brand_name: true,
            slug: true,
            status: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(200).json({ requests });

  } catch (error) {
    console.error("getOwnerTransferRequests error:", error);

    return res.status(500).json({
      message: "Failed to fetch owner transfer requests",
    });
  }
};

// POST: ตัดสินคำขอเปลี่ยน OWNER — POST /admin/owner-transfer-requests/:id/decision
// body: { decision: "APPROVED" | "REJECTED" }
// APPROVED → (transaction เดียว) อีเมลใหม่เป็น OWNER ของร้าน + owner ผู้ยื่นเดิมเป็น ADMIN
export const decideOwnerTransferRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const admin = req.admin!;
    const id = req.params.id as string;
    const { decision } = req.body as { decision?: string };

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return res.status(400).json({
        message: "Invalid decision. Decision must be APPROVED or REJECTED",
      });
    }

    const request = await prisma.ownerTransferRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({
        message: "Owner transfer request not found",
      });
    }

    if (request.status !== OwnerTransferRequestStatus.PENDING) {
      return res.status(409).json({
        message: "This request has already been decided",
      });
    }

    // ตรวจซ้ำก่อนตัดสิน: owner ผู้ยื่นยังต้องเป็น OWNER ของร้านอยู่
    const ownerMember = await prisma.brandMember.findFirst({
      where: {
        id: request.current_owner_member_id,
        brand_id: request.brand_id,
        role: "OWNER",
      },
      select: { id: true },
    });

    if (!ownerMember) {
      return res.status(409).json({
        message:
          "Request is stale — the requesting member is no longer the brand OWNER",
      });
    }

    const now = new Date();
    const newOwnerEmail = normalizeEmail(request.new_owner_email);

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === "APPROVED") {
        // 1. owner เดิม → ADMIN
        await tx.brandMember.update({
          where: { id: request.current_owner_member_id },
          data: { role: "ADMIN" },
        });

        // 2. หา/สร้างบัญชี Admin จากอีเมลใหม่ (เลียนแบบ addBrandMember)
        const newAdmin = await tx.admin.upsert({
          where: { email: newOwnerEmail },
          update: {},
          create: {
            email: newOwnerEmail,
            role: "SHOP_ADMIN",
          },
        });

        // 3. สมาชิกอีเมลใหม่ → OWNER (ถ้ายังไม่เป็นสมาชิกจะถูกเพิ่มเข้าร้านพร้อม role OWNER)
        await tx.brandMember.upsert({
          where: {
            brand_id_admin_id: {
              brand_id: request.brand_id,
              admin_id: newAdmin.id,
            },
          },
          update: { role: "OWNER" },
          create: {
            brand_id: request.brand_id,
            admin_id: newAdmin.id,
            role: "OWNER",
          },
        });
      }

      // 4. บันทึกผลการตัดสิน
      return tx.ownerTransferRequest.update({
        where: { id: request.id },
        data: {
          status: decision,
          decided_by: admin.id,
          decided_at: now,
        },
        select: OWNER_TRANSFER_REQUEST_SELECT,
      });
    });

    // อนุมัติ = role ของสมาชิก 2 คนเปลี่ยน — ล้าง cache สิทธิ์ของร้านนี้ทันที
    if (decision === "APPROVED") {
      const brand = await prisma.brand.findUnique({
        where: { id: request.brand_id },
        select: { slug: true },
      });

      invalidateBrandAccess({ slug: brand?.slug });
    }

    return res.status(200).json({
      message:
        decision === "APPROVED"
          ? "Ownership transferred successfully"
          : "Owner transfer request rejected",
      request: updated,
    });

  } catch (error) {
    console.error("decideOwnerTransferRequest error:", error);

    return res.status(500).json({
      message: "Failed to decide owner transfer request",
    });
  }
};
