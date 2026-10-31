import { Router } from "express";
import { getconsent, setConsent } from "../controllers/userconsent";
 import { authMiddleware } from "../middlewares/auth"; 
const router = Router();
 
router.get("/", authMiddleware ,getconsent);
router.post("/",authMiddleware , setConsent);
 
export default router;