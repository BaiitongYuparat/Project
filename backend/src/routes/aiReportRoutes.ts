import { Router } from "express";

import { createAiReport } from "../controllers/aiReport";
import {
  uploadReportScreenshotSingle,
  handleUploadError,
} from "../middlewares/upload";

const router = Router();

// shopper รายงานปัญหาการใช้ AI (แนบภาพหน้าจอได้ 1 ภาพ)
router.post("/", uploadReportScreenshotSingle, handleUploadError, createAiReport);

export default router;
