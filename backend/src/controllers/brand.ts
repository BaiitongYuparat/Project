import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { BrandMemberRole, Prisma } from "@prisma/client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../middlewares/upload";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BrandAccessError, getBrandAccess } from "../services/brandAccessService";
//สร้าง slug ไว้เป็น url ที่ไม่ซ้ำกัน
const generateSlug = (brandName: string) => {
  return brandName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\wก-๙-]/g, "");
};

//ตรวจสอบว่าเป็น URL ที่ถูกต้องหรือไม่
const isValidUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// ลบไฟล์ใน S3 กรณีสมัครไม่สำเร็จ (กันไฟล์ค้าง)
const deleteS3File = (key: string | null) => {
  if (!key) return;
  s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    })
  ).catch((e) => console.error("cleanup s3 failed:", e));
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        brand_name: true,
        owner_name: true,
        email: true,
        store_url: true,
        status: true,
        created_at: true,
      },
      orderBy: { brand_name: "asc" },
    });
    res.status(200).json(brands);
  } catch (error) {
    console.error("getBrands error:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
};

export const registerBrand = async (req: Request, res: Response) => {
  const { brand_name, owner_name, email, phone_number, store_url, ebiz_reg_no } = req.body;

  const file = req.file as Express.MulterS3.File | undefined;
  const ebizKey = file?.key ?? null;

  try {
    if (!brand_name?.trim() || !owner_name?.trim() || !email?.trim() || !store_url?.trim()) {
      deleteS3File(ebizKey);
      return res.status(400).json({
        error: "กรุณากรอก brand_name, owner_name, email และ store_url",
      });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      deleteS3File(ebizKey);
      return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
    }
    if (!isValidUrl(store_url.trim())) {
      deleteS3File(ebizKey);
      return res.status(400).json({ error: "store_url ต้องขึ้นต้นด้วย http:// หรือ https://" });
    }
    if (!ebizKey) {
      return res.status(400).json({ error: "กรุณาแนบไฟล์ทะเบียนพาณิชย์อิเล็กทรอนิกส์" });
    }

    const slug = generateSlug(brand_name);
    // ตรวจสอบว่า slug ที่สร้างไม่เป็นค่าว่าง
    if (!slug) {
      deleteS3File(ebizKey);
      return res.status(400).json({
        error: "ไม่สามารถสร้าง slug จากชื่อร้านได้ กรุณาเปลี่ยนชื่อร้าน",
      });
    }

    // ตรวจสอบ slug ซ้ำ
    const existingSlug = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      deleteS3File(ebizKey);
      return res.status(409).json({
        error: "ชื่อ URL ร้านค้านี้ถูกใช้งานแล้ว กรุณาเปลี่ยนชื่อร้าน",
        field: "slug",
      });
    }

    const newBrand = await prisma.brand.create({
      data: {
        brand_name: brand_name.trim(),
        slug,
        owner_name: owner_name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone_number?.trim() || null,
        store_url: store_url.trim(),
        ebiz_registration: ebizKey,
        ebiz_reg_no: ebiz_reg_no?.trim() || null,
        status: "PENDING",
      },
      select: { id: true, brand_name: true, status: true, created_at: true, slug: true },
    });

    res.status(201).json(newBrand);
  } catch (error) {
    deleteS3File(ebizKey);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        error: "ข้อมูลนี้ถูกใช้สมัครแล้ว",
        fields: (error.meta?.target as string[]) ?? [],
      });
    }
    console.error("registerBrand error:", error);
    res.status(500).json({ error: "Failed to register brand" });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  const id = req.params.id as string

  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true, ebiz_registration: true },
    });

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }
    // ลบแถวใน DB ก่อน 
    await prisma.brand.delete({ where: { id } });
    //ลบไฟล์ใน S3
    deleteS3File(brand.ebiz_registration);

    res.status(200).json({ message: "Deleted brand successfully" });
  } catch (error) {
    console.error("deleteBrand error:", error);
    res.status(500).json({ error: "Failed to delete brand" });
  }
};

export const getBrandById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        brand_name: true,
        owner_name: true,
        email: true,
        phone_number: true,
        store_url: true,
        ebiz_reg_no: true,
        ebiz_registration: true,
        status: true,
        created_at: true,
      },
    });

    if (!brand) return res.status(404).json({ error: "Brand not found" });

    const { ebiz_registration, ...rest } = brand;
    const ebiz_file_url = ebiz_registration
      ? await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: ebiz_registration,
        }),
        { expiresIn: 300 } // 5 นาที
      )
      : null;

    res.status(200).json({ ...rest, ebiz_file_url });
  } catch (error) {
    console.error("getBrandById error:", error);
    res.status(500).json({ error: "Failed to fetch brand" });
  }
}

export const updateBrandStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.findUnique({
        where: { id },
        select: { id: true, email: true, status: true },
      });
      if (!brand) return null;

      const updatedBrand = await tx.brand.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          brand_name: true,
          owner_name: true,
          email: true,
          phone_number: true,
          store_url: true,
          ebiz_reg_no: true,
          status: true,
          created_at: true,
        },
      });

      let ownerLinked = false;

      if (status === "APPROVED" && brand.email) {
        // หา user จากอีเมลที่ใช้สมัครร้าน
        const user = await tx.user.findUnique({
          where: { email: brand.email },
          select: { id: true },
        });

        if (user) {
          await tx.brandMember.upsert({
            where: {
              brand_id_user_id: { brand_id: brand.id, user_id: user.id },
            },
            update: { role: "OWNER" },
            create: { brand_id: brand.id, user_id: user.id, role: "OWNER" },
          });
          ownerLinked = true;
        }
      }

      return { updatedBrand, ownerLinked };
    });

    if (!result) return res.status(404).json({ error: "Brand not found" });

    res.status(200).json({
      ...result.updatedBrand,
      owner_linked: result.ownerLinked,
    });
  } catch (error) {
    console.error("updateBrandStatus error:", error);
    res.status(500).json({ error: "Failed to update brand status" });
  }
};


export const checkBrandAccess = async (req: Request, res: Response) => {
  const slugParam = req.params.slug;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    // ตรวจการ login
    if (!userId || !userRole) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    //เช็ค type slug ต้องเป็น string
    if (typeof slugParam !== "string") {
      return res.status(400).json({
        error: "Invalid brand slug",
      });
    }

    // เรียกใช้ Service
    const result = await getBrandAccess(
      slugParam,
      userId,
    );

    return res.status(200).json({
      authorized: true,
      ...result,
    });

  } catch (error) {
    if (error instanceof BrandAccessError) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...error.details,
      });
    }
    console.error("checkBrandAccess error:", error);

    return res.status(500).json({
      error: "Failed to check brand access",
    });
  }
};


export const getAllBrandMembers = async (req: Request, res: Response) => {
  try {
    const members = await prisma.brandMember.findMany({
      select: {
        id: true,
        role: true,
        created_at: true,
        user: { select: { id: true, name: true, email: true } },
        brand: { select: { id: true, brand_name: true, status: true } },
      },
      orderBy: [{ brand: { brand_name: "asc" } }, { role: "asc" }, { created_at: "asc" }],
    });

    res.status(200).json(
      members.map((m) => ({
        id: m.id,
        role: m.role,
        created_at: m.created_at,
        user_name: m.user.name,
        email: m.user.email,
        brand_id: m.brand.id,
        brand_name: m.brand.brand_name,
        brand_status: m.brand.status
      }))
    );
  } catch (error) {
    console.error("getBrandMembers error:", error);
    res.status(500).json({ error: "Failed to fetch brand members" });
  }
};

//---------------------shop admin-------------------------


// GET: ดึงสมาชิกทั้งหมดของร้าน
export const getBrandMembers = async (
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

    const members = await prisma.brandMember.findMany({
      where: {
        brand_id: brandId,
      },
      select: {
        id: true,
        role: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { created_at: "asc" },
      ],
    });

    return res.status(200).json({
      currentRole: req.brand?.role,
      members: members.map((m) => ({
        id: m.id,
        user_id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        created_at: m.created_at,
      })),
    });

  } catch (error) {
    console.error("getBrandMembers error:", error);

    return res.status(500).json({
      message: "Failed to fetch brand members",
    });
  }
};


// POST: เพิ่มสมาชิกเข้าร้าน
export const addBrandMember = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const currentRole = req.brand?.role;
    const { email } = req.body;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    // เฉพาะ OWNER เท่านั้น
    if (currentRole !== BrandMemberRole.OWNER) {
      return res.status(403).json({
        message: "Only OWNER can add members",
      });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ค้นหา User จาก Email
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ตรวจสอบสมาชิกซ้ำ
    const existingMember = await prisma.brandMember.findUnique({
      where: {
        brand_id_user_id: {
          brand_id: brandId,
          user_id: user.id,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({
        message: "User is already a member of this brand",
      });
    }

    // เพิ่มเป็น ADMIN
    const member = await prisma.brandMember.create({
      data: {
        brand_id: brandId,
        user_id: user.id,
        role: BrandMemberRole.ADMIN,
      },
      select: {
        id: true,
        role: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Member added successfully",
      member: {
        id: member.id,
        user_id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        created_at: member.created_at,
      },
    });

  } catch (error) {
    console.error("addBrandMember error:", error);

    return res.status(500).json({
      message: "Failed to add member",
    });
  }
};


// DELETE: นำสมาชิกออกจากร้าน
export const removeBrandMember = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const currentRole = req.brand?.role;
    const { memberId } = req.params;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    // เฉพาะ OWNER เท่านั้น
    if (currentRole !== BrandMemberRole.OWNER) {
      return res.status(403).json({
        message: "Only OWNER can remove members",
      });
    }

    if (!memberId) {
      return res.status(400).json({
        message: "Invalid member ID",
      });
    }
    if (typeof memberId !== "string" || !memberId) {
      return res.status(400).json({
        message: "Invalid member ID",
      });
}

    // ค้นหาเฉพาะสมาชิกในร้านนี้
    const targetMember = await prisma.brandMember.findFirst({
      where: {
        id: memberId,
        brand_id: brandId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    // ป้องกันการลบ OWNER
    if (targetMember.role === BrandMemberRole.OWNER) {
      return res.status(403).json({
        message: "Cannot remove the brand owner",
      });
    }

    // ลบเฉพาะความสัมพันธ์ BrandMember
    await prisma.brandMember.delete({
      where: {
        id: targetMember.id,
      },
    });

    return res.status(200).json({
      message: "Member removed successfully",
    });

  } catch (error) {
    console.error("removeBrandMember error:", error);

    return res.status(500).json({
      message: "Failed to remove member",
    });
  }
};