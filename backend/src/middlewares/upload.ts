import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { Request, Response, NextFunction } from "express";

// 1. Export s3 Client เพื่อให้ controller อื่นนำไปใช้ลบไฟล์ได้
export const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// 2. Upload สำหรับ Body Images
export const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME!,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: any, file, cb) => {
            const userId = req.user?.id;

            if (!userId) {
                return cb(new Error("Unauthorized"));
            }

            const sanitizedUserId = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, "");
            const ext = path.extname(file.originalname);

            cb(null, `temp/${sanitizedUserId}/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});



// 3. Upload สำหรับ Clothing Images
export const uploadClothing = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME!,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req: any, file, cb) => {
            const userId = req.user?.id;

            if (!userId) {
                return cb(new Error("Unauthorized"));
            }

            const sanitizedUserId = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, "");
            const ext = path.extname(file.originalname);

            // โฟลเดอร์: clothings/{userId}/{เวลา}_{เลขสุ่ม}{นามสกุล}
            cb(null, `clothings/${sanitizedUserId}/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});

// 4. จัดการ error จาก multer ให้ตอบเป็น JSON
export const handleUploadError = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!err) {
        return next();
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size must not exceed 5MB" });
    }

    if (err.message?.includes("Unauthorized")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(400).json({ message: err.message || "File upload failed" });
};

 //Upload ทะเบียนพาณิชย์ของแบรนด์
export const uploadBrandDoc = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `BrandDoc/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, JPG or PNG files are allowed"));
  },
});

export const uploadEbizRegistration = uploadBrandDoc.single("ebiz_registration");