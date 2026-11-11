import { Router } from "express";
import {
  getBrands,
  getBrandById,
  deleteBrand,
  updateBrandStatus,
   getAllBrandMembers
} from "../controllers/brand";
import { adminAuthMiddleware } from "../middlewares/adminAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { getModels } from "../controllers/model";
import {
  getAdminProductsController,
  getAdminProductStatsController,
} from "../controllers/product";
import { deleteUser , updateUserStatus , getUsers } from "../controllers/user";
const router = Router();

// ทุก Route ต้องเป็น Super Admin (session ฝั่ง Admin — cookie admin_token)
router.use(adminAuthMiddleware, requireSuperAdmin);

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

// User Management (shopper)
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/status", updateUserStatus);



export default router;
