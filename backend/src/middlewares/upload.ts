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

// Upload รูปโมเดล Try-On (Model Management — ระดับแพลตฟอร์ม ไม่ผูก user/brand)
export const uploadModelImage = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    // key ไม่มีการเขียนทับเดิม → ให้ browser cache รูปได้ยาว
    cacheControl: "public, max-age=31536000, immutable",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(
        null,
        `model-images/${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG or PNG files are allowed"));
  },
});

export const uploadModelImageSingle = uploadModelImage.single("image");

// รับรูปโมเดล 4 มุม (หน้า/หลัง/ซ้าย/ขวา) — แต่ละฟิลด์สูงสุด 1 ไฟล์
export const uploadModelImages = uploadModelImage.fields([
  { name: "image_front", maxCount: 1 },
  { name: "image_back", maxCount: 1 },
  { name: "image_left", maxCount: 1 },
  { name: "image_right", maxCount: 1 },
]);

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

// Upload โลโก้ร้าน (Store Settings) — ต้องผ่าน requireBrandAccess ก่อน จึงมี req.brand
export const uploadBrandLogo = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req: any, file, cb) => {
      const brandId = req.brand?.id;

      if (!brandId) {
        return cb(new Error("Brand access required"));
      }

      const sanitizedBrandId = String(brandId)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const ext = path.extname(file.originalname).toLowerCase();

      cb(
        null,
        `brand-logos/${sanitizedBrandId}/${Date.now()}_${Math.round(
          Math.random() * 1e9
        )}${ext}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG or WEBP files are allowed"));
  },
});

export const uploadBrandLogoSingle = uploadBrandLogo.single("logo");

// Upload สำหรับ Product Images
export const uploadProduct = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    // key ของรูปสินค้าไม่มีการเขียนทับเดิม → ให้ browser cache รูปได้ยาว
    cacheControl: "public, max-age=31536000, immutable",

    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },

    key: (req: any, file, cb) => {
      const brandId = req.brand?.id;

      if (!brandId) {
        return cb(new Error("Brand access required"));
      }

      const sanitizedBrandId = String(brandId)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const ext = path.extname(file.originalname).toLowerCase();

      cb(
        null,
        `brand-products/${sanitizedBrandId}/${Date.now()}_${Math.round(
          Math.random() * 1e9
        )}${ext}`
      );
    },
  }),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG or WEBP files are allowed"));
    }
  },
});

// รองรับรูปสินค้าสูงสุด 5 รูปต่อครั้ง
export const uploadProductImages = uploadProduct.array("images", 5);