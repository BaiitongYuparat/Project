import { Router } from "express";
import { uploadBody4Angles, handleUploadError } from "../middlewares/upload";
import { uploadAndVerifyBodyImages } from "../controllers/uploadBody";

const router = Router();

// authMiddleware อยู่ใน index.ts แล้ว ไม่ต้องใส่ซ้ำที่นี่
router.post("/body", uploadBody4Angles, handleUploadError, uploadAndVerifyBodyImages);

export default router;