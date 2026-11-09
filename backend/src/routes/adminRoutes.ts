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
import { getModels } from "../controllers/model";
import {
  getAdminProductsController,
  getAdminProductStatsController,
} from "../controllers/product";

const router = Router();

// ทุก Route ต้องเป็น Super Admin
router.use(authMiddleware, requireSuperAdmin);

// Brand Management
router.get("/brands", getBrands);
router.get("/brands/members", getAllBrandMembers);
router.get("/brands/:id", getBrandById);
router.put("/brands/:id/status", updateBrandStatus);
router.delete("/brands/:id", deleteBrand);

// Model Management
router.get("/models", getModels);
router.get("/products/stats", getAdminProductStatsController); // ต้องมาก่อน /products/:id ถ้าเพิ่มทีหลัง
router.get("/products", getAdminProductsController);



export default router;