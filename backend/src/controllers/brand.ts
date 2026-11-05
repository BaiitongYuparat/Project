import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../middlewares/upload";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


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

    const newBrand = await prisma.brand.create({
      data: {
        brand_name: brand_name.trim(),
        owner_name: owner_name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone_number?.trim() || null,
        store_url: store_url.trim(),
        ebiz_registration: ebizKey,
        ebiz_reg_no: ebiz_reg_no?.trim() || null,
        status: "PENDING",
      },
      select: { id: true, brand_name: true, status: true, created_at: true },
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
    const updatedBrand = await prisma.brand.update({
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
        ebiz_registration: true,
        status: true,
        created_at: true,
      },
    });

    res.status(200).json(updatedBrand);
  } catch (error) {
    console.error("updateBrandStatus error:", error);
    res.status(500).json({ error: "Failed to update brand status" });
  }
}