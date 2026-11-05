import { Router } from "express";
import { getBrands, registerBrand , deleteBrand , getBrandById  , updateBrandStatus , checkBrandAccess} from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", getBrands);
router.get("/:id", getBrandById);
router.delete("/:id", deleteBrand);
router.put("/:id/status", updateBrandStatus);
router.post("/register", uploadEbizRegistration, handleUploadError, registerBrand);
router.get("/:slug/access", authMiddleware , checkBrandAccess);

export default router;