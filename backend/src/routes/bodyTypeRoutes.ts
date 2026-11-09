import { Router } from "express";
import { getBodyType, analyzeAndSaveBodyType } from "../controllers/bodyType";

const router = Router();

// ดึงผล body type ที่วิเคราะห์ไว้แล้ว
router.get("/", getBodyType);

// วิเคราะห์ใหม่ (กรณี user กดวิเคราะห์ซ้ำ)
router.post("/analyze", analyzeAndSaveBodyType);

export default router;