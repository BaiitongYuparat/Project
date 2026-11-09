import { Router } from "express";
import { getBodyType, analyzeAndSaveBodyType } from "../controllers/bodytype";

const router = Router();

router.get("/", getBodyType);
router.post("/analyze", analyzeAndSaveBodyType);

export default router;