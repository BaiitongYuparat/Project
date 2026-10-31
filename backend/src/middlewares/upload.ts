import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';

// ตั้งค่า S3 Client อ่านค่าจาก .env
const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ตั้งค่า Multer ให้บันทึกไฟล์ตรงลง AWS S3
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      // ตั้งชื่อไฟล์ใน S3 ไม่ให้ซ้ำกันด้วย Timestamp
      const ext = path.extname(file.originalname);
      const filename = `body-images/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // จำกัดขนาดไฟล์ไม่เกิน 5MB
  },
  fileFilter: (req, file, cb) => {
    // กรองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น!'));
    }
  },
});