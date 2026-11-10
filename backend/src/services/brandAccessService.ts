import { prisma } from "../../lib/prisma";
import { BrandMemberRole, BrandStatus, UserRole } from "@prisma/client";

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

//---------------------BrandMember permission (enforce ใน service layer ตาม PROJECT.md)---------------------

/**
 * ตรวจสิทธิ์การจัดการสมาชิกของร้าน:
 * - ทั้ง OWNER และ ADMIN จัดการ (add / remove / แก้ role) สมาชิกที่เป็น ADMIN ได้
 * - ADMIN ห้ามจัดการสมาชิกที่เป็น OWNER ในทุกกรณี
 */
export const assertCanManageMember = (
  currentRole: BrandMemberRole | UserRole | undefined,
  targetRole: BrandMemberRole
): void => {
  if (
    currentRole !== BrandMemberRole.OWNER &&
    currentRole !== BrandMemberRole.ADMIN
  ) {
    throw new BrandAccessError(
      403,
      "You are not allowed to manage members of this brand"
    );
  }

  if (
    targetRole === BrandMemberRole.OWNER &&
    currentRole !== BrandMemberRole.OWNER
  ) {
    throw new BrandAccessError(
      403,
      "ADMIN is not allowed to manage the brand OWNER"
    );
  }
};

export const getBrandAccess = async (
  slug: string,
  userId: string
) => {
  const brand = await prisma.brand.findUnique({
    where: { slug },
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
        take: 1,
      },
    },
  });

  if (!brand) {
    throw new BrandAccessError(404, "Brand not found");
  }

  // ต้องเป็นสมาชิก OWNER หรือ ADMIN เท่านั้น
  if (brand.members.length === 0) {
    throw new BrandAccessError(403, "You are not a member of this brand");
  }

  if (!brand.slug) {
    throw new BrandAccessError(400, "Brand slug is missing");
  }

  if (brand.status !== BrandStatus.APPROVED) {
    throw new BrandAccessError(403, "Brand is not approved", {
      status: brand.status,
    });
  }

  return {
    brand: {
      id: brand.id,
      brand_name: brand.brand_name,
      slug: brand.slug,
      status: brand.status,
    },
    role: brand.members[0].role,
  };
};