import { Router } from "express";
import { upload, handleUploadError } from "../middlewares/upload";
import { verifyBodyImage, confirmBodyImages, getBodyImages } from "../controllers/uploadBody";

const router = Router();
router.post("/verify/:angle", upload.single("image"), handleUploadError, verifyBodyImage);
router.post("/body", confirmBodyImages);
router.get("/body/:bodyId", getBodyImages);

export default router;