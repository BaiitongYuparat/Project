import { Router } from "express";
import { getBrands, registerBrand , deleteBrand } from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError } from "../middlewares/upload";

const router = Router();

router.get("/", getBrands);
router.delete("/:id", deleteBrand);
router.post("/register", uploadEbizRegistration, handleUploadError, registerBrand);

export default router;