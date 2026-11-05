import { Router } from "express";
import { getBrands, registerBrand , deleteBrand , getBrandById  , updateBrandStatus} from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError } from "../middlewares/upload";

const router = Router();

router.get("/", getBrands);
router.get("/:id", getBrandById);
router.delete("/:id", deleteBrand);
router.put("/:id/status", updateBrandStatus);
router.post("/register", uploadEbizRegistration, handleUploadError, registerBrand);

export default router;