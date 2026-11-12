import { Router } from "express";
import { getBrands, registerBrand , getBrandById  , checkBrandAccess, getBrandMembers, addBrandMember, removeBrandMember, updateBrandMemberRole} from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError,uploadProductImages } from "../middlewares/upload";
import { adminAuthMiddleware } from "../middlewares/adminAuth";
import { requireBrandAccess } from "../middlewares/brandAccess";
import { createProductController, deleteProductController, getProductByIdController, getProductsController, recheckProductImageController, updateProductController } from "../controllers/product";
import { getSizeChartTemplatesController, getProductOptionsController } from "../controllers/productConfig";
import { createBrandSizeChartController, deleteBrandSizeChartController, getBrandSizeChartByIdController, getBrandSizeChartsController, updateBrandSizeChartController } from "../controllers/sizeChart";

const router = Router();

// สมัครร้าน: เปิดให้ใครก็ได้กรอก (ไม่ต้อง login) — ระบบจะสร้างบัญชี Admin ให้เมื่อร้านได้รับอนุมัติ
router.post("/register", uploadEbizRegistration, handleUploadError, registerBrand);

// Route ฝั่งจัดการร้าน ใช้ session ผู้ดูแล (ตาราง Admin — cookie admin_token)
router.get("/:slug/access", adminAuthMiddleware , checkBrandAccess);

// ตารางไซส์ standard + ชุดตัวเลือกฤดู/โอกาส ของแพลตฟอร์ม (ใช้ตอนเพิ่ม/แก้สินค้า)
router.get("/size-chart-templates", adminAuthMiddleware, getSizeChartTemplatesController);
router.get("/product-options", adminAuthMiddleware, getProductOptionsController);

// ตารางไซส์กลางของร้าน (collection) — สินค้าอ้างอิง
router.use("/:slug/size-charts", adminAuthMiddleware, requireBrandAccess);

router.get("/:slug/size-charts", getBrandSizeChartsController);
router.get("/:slug/size-charts/:id", getBrandSizeChartByIdController);
router.post("/:slug/size-charts", createBrandSizeChartController);
router.put("/:slug/size-charts/:id", updateBrandSizeChartController);
router.delete("/:slug/size-charts/:id", deleteBrandSizeChartController);

// ตรวจสอบสิทธิ์ก่อนเข้าถึง API สินค้าในร้าน
router.use("/:slug/products",adminAuthMiddleware,requireBrandAccess);

// Product Management
router.get("/:slug/products", getProductsController);
router.get("/:slug/products/:id", getProductByIdController);
router.post("/:slug/products",uploadProductImages, handleUploadError, createProductController);
router.put("/:slug/products/:id",uploadProductImages, handleUploadError, updateProductController);
router.delete("/:slug/products/:id", deleteProductController);
// ส่งรูปที่ FAILED กลับเข้าคิวตรวจคุณภาพใหม่ (cooldown 30 วินาทีฝั่ง service)
router.post("/:slug/products/:productId/images/:imageId/recheck", recheckProductImageController);
//BrandMember Management

router.use("/:slug/members",adminAuthMiddleware,requireBrandAccess);

router.get("/:slug/members",getBrandMembers);
router.post("/:slug/members",addBrandMember);
router.patch("/:slug/members/:memberId/role",updateBrandMemberRole);
router.delete("/:slug/members/:memberId",removeBrandMember);


export default router;
