import { Router } from "express";
import {
  getBrands,
  getBrandById,
  deleteBrand,
  updateBrandStatus,
   getAllBrandMembers
} from "../controllers/brand";
import { authMiddleware } from "../middlewares/auth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";

const router = Router();

// ทุก Route ต้องเป็น Super Admin
router.use(authMiddleware, requireSuperAdmin);

// Brand Management
router.get("/brands", getBrands);
router.get("/brands/members", getAllBrandMembers);
router.get("/brands/:id", getBrandById);
router.put("/brands/:id/status", updateBrandStatus);
router.delete("/brands/:id", deleteBrand);

export default router;