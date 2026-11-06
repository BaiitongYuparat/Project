import { prisma } from "../../lib/prisma";
import { UserRole, BrandMemberRole } from "@prisma/client";

// กำหนด Error สำหรับส่งสถานะกลับไปให้ Controller
export class BrandAccessError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: object
  ) {
    super(message);
    this.name = "BrandAccessError";
  }
}

export const getBrandAccess = async (
  slug: string,
  userId: string,
  userRole: UserRole
) => {
  // ค้นหา Brand และตรวจสอบสมาชิก
  const brand = await prisma.brand.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      brand_name: true,
      slug: true,
      status: true,
      members: {
        where: {
          user_id: userId,
          role: {
            in: [BrandMemberRole.OWNER, BrandMemberRole.ADMIN],
          },
        },
        select: {
          role: true,
        },
      },
    },
  });

  if (!brand) {
    throw new BrandAccessError(404, "Brand not found");
  }

  // ตรวจสอบสิทธิ์
  let accessRole: UserRole | BrandMemberRole;

  if (userRole === UserRole.SUPER_ADMIN) {
    accessRole = UserRole.SUPER_ADMIN;
  } else {
    if (brand.members.length === 0) {
      throw new BrandAccessError(
        403,
        "You do not have access to this brand"
      );
    }

    accessRole = brand.members[0].role;
  }

  // ตรวจสอบสถานะร้าน
  if (
    userRole !== UserRole.SUPER_ADMIN &&
    brand.status !== "APPROVED"
  ) {
    throw new BrandAccessError(
      403,
      "Brand is not approved",
      { status: brand.status }
    );
  }

  // ส่งข้อมูลกลับให้ Controller
  return {
    brand: {
      id: brand.id,
      brand_name: brand.brand_name,
      slug: brand.slug,
      status: brand.status,
    },
    role: accessRole,
  };
};