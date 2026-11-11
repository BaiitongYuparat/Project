import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { signAdminToken } from "../../lib/jwt";

// ระบบ login ฝั่งผู้ดูแล (ตาราง Admin) — แยกออกจาก /auth ของ shopper โดยสิ้นเชิง
const googleClient = new OAuth2Client();

// ฝั่งผู้ดูแลใช้ OAuth client ของตัวเองเท่านั้น (ต่างจากฝั่งลูกค้า: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID_APP)
const adminAllowedAudiences = [
  process.env.GOOGLE_CLIENT_ID_ADMIN,
].filter(Boolean) as string[];

if (adminAllowedAudiences.length === 0) {
  console.warn("GOOGLE_CLIENT_ID_ADMIN is not set — admin login will fail");
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// ข้อมูล admin + ร้านที่ดูแล (ใช้ตอน login และ /me เพื่อ redirect ไป dashboard ของร้าน)
const getAdminWithBrands = async (adminId: string) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      brandMembers: {
        select: {
          role: true,
          brand: {
            select: {
              id: true,
              brand_name: true,
              status: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!admin) return null;

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    brandMemberships: admin.brandMembers.map((member) => ({
      brandId: member.brand.id,
      brandName: member.brand.brand_name,
      brandStatus: member.brand.status,
      role: member.role,
      slug: member.brand.slug,
    })),
  };
};

export const adminLoginGoogle = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: adminAllowedAudiences,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: "Email not verified" });
    }

    const { sub: googleId, email, name } = payload;

    try {
      // หาบัญชี Admin จาก googleId ก่อน แล้ว fallback ไปหาด้วย email
      let admin = await prisma.admin.findFirst({
        where: { OR: [{ googleId }, { email }] },
      });

      // ห้ามสมัครบัญชี admin ใหม่เอง — ต้องถูกสร้างโดยระบบ (สมัครร้าน / ถูกเชิญ / ตั้งค่าโดย Super Admin)
      if (!admin) {
        return res.status(403).json({
          message: "ไม่พบบัญชีผู้ดูแลนี้ในระบบ",
          code: "ADMIN_NOT_FOUND",
        });
      }

      if (!admin.googleId) {
        // มีบัญชีอีเมลอยู่แล้ว ให้เชื่อม Google เข้าไป
        admin = await prisma.admin.update({
          where: { id: admin.id },
          data: { googleId },
        });
      }

      if (admin.status === "suspended") {
        return res.status(403).json({
          message: "Account suspended",
          code: "ADMIN_SUSPENDED",
        });
      }
      if (admin.status !== "active") {
        return res.status(403).json({ message: "Account is not active" });
      }

      const token = signAdminToken(admin.id);
      const safeAdmin = await getAdminWithBrands(admin.id);
      if (!safeAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      //ถ้าเป็น mobile ให้เก็บ token (สำหรับแอปผู้ดูแลในอนาคต)
      if (req.body.platform === "mobile") {
        return res.json({ token, admin: safeAdmin });
      }

      // เว็บ: ตั้ง httpOnly cookie ไม่ส่ง token ใน body
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE_MS });

      return res.json({ admin: safeAdmin });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Google authentication failed" });
  }
};

export const getCurrentAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const admin = await getAdminWithBrands(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    return res.json({ admin });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const logoutAdmin = async (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);

  return res.status(200).json({
    message: "Logout success",
  });
};

export const devAdminLogin = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }

  const { email } = req.body;

  try {
    // dev login ต้องมีบัญชี admin อยู่แล้วเท่านั้น
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const token = signAdminToken(admin.id);
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
