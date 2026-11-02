import { Router } from "express";
import { uploadBody4Angles, handleUploadError } from "../middlewares/upload";
import { uploadAndVerifyBodyImages, getBodyImages } from "../controllers/uploadBody";

const router = Router();

router.post("/body", uploadBody4Angles, handleUploadError, uploadAndVerifyBodyImages);
router.get("/body/:bodyId", getBodyImages); 
export default router;