import { Router } from "express";
import { submitAppeal, getMyAppeals } from "../controllers/appeal";
import { appealAuthMiddleware } from "../middlewares/appealAuth";

const router = Router();

// ทุก route ต้องมี appeal_token (ออกให้ตอน login แล้วโดนแจ้งว่าบัญชีถูกระงับ)
router.use(appealAuthMiddleware);

router.post("/", submitAppeal);
router.get("/mine", getMyAppeals);

export default router;
