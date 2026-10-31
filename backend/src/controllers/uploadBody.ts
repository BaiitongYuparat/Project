import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MulterS3File extends Express.Multer.File {
  location: string; // URL ของไฟล์ที่อยู่บน AWS S3
}

export const uploadBodyImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as MulterS3File;
    const { body_id, angle } = req.body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!file) {
      return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์รูปภาพ' });
    }
    if (!body_id || !angle) {
      return res.status(400).json({ message: 'กรุณาระบุ body_id และ angle (front, left, right, back)' });
    }

    // 2. ตรวจสอบว่ามีรูปภาพในมุม (angle) นั้นของ body_id หรือยัง
    const existingImage = await prisma.image.findUnique({
      where: {
        body_id_angle: {
          body_id: body_id,
          angle: angle,
        },
      },
    });

    let savedImage;

    if (existingImage) {
      // ถ้ามีแล้ว -> ให้ Update เปลี่ยน URL และรีเซ็ตสถานะเป็น PENDING เพื่อรอตรวจใหม่
      savedImage = await prisma.image.update({
        where: { id: existingImage.id },
        data: {
          s3: file.location,
          quality_status: 'PENDING',
        },
      });
    } else {
      // ถ้ายังไม่มี -> ให้ Create บันทึกแถวใหม่
      savedImage = await prisma.image.create({
        data: {
          body_id: body_id,
          angle: angle,
          s3: file.location,
          quality_status: 'PENDING',
        },
      });
    }

    return res.status(200).json({
      message: 'อัปโหลดรูปภาพสำเร็จ',
      data: savedImage,
    });
  } catch (error) {
    console.error('Error uploading body image:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};