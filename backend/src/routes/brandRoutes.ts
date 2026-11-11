import { Router } from "express";
import { getBrands, registerBrand , getBrandById  , checkBrandAccess, getBrandMembers, addBrandMember, removeBrandMember, updateBrandMemberRole} from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError,uploadProductImages } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";
import { adminAuthMiddleware } from "../middlewares/adminAuth";
import { requireBrandAccess } from "../middlewares/brandAccess";
import { createProductController, deleteProductController, getProductByIdController, getProductsController, updateProductController } from "../controllers/product";

const router = Router();

// สมัครร้าน: shopper (User) กรอกฟอร์มได้เหมือนเดิม — ระบบจะสร้างบัญชี Admin ให้เมื่อร้านได้รับอนุมัติ
router.post("/register", authMiddleware , uploadEbizRegistration, handleUploadError, registerBrand);

// Route ฝั่งจัดการร้าน ใช้ session ผู้ดูแล (ตาราง Admin — cookie admin_token)
router.get("/:slug/access", adminAuthMiddleware , checkBrandAccess);

// ตรวจสอบสิทธิ์ก่อนเข้าถึง API สินค้าในร้าน
router.use("/:slug/products",adminAuthMiddleware,requireBrandAccess);

// Product Management
router.get("/:slug/products", getProductsController);
router.get("/:slug/products/:id", getProductByIdController);
router.post("/:slug/products",uploadProductImages, handleUploadError, createProductController);
router.put("/:slug/products/:id",uploadProductImages, handleUploadError, updateProductController);
router.delete("/:slug/products/:id", deleteProductController);
//BrandMember Management

router.use("/:slug/members",adminAuthMiddleware,requireBrandAccess);

router.get("/:slug/members",getBrandMembers);
router.post("/:slug/members",addBrandMember);
router.patch("/:slug/members/:memberId/role",updateBrandMemberRole);
router.delete("/:slug/members/:memberId",removeBrandMember);


export default router;
