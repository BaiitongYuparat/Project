import { Router } from "express";
import { getBrands, registerBrand , deleteBrand , getBrandById  , updateBrandStatus , checkBrandAccess, getBrandMembers, addBrandMember, removeBrandMember} from "../controllers/brand";
import { uploadEbizRegistration, handleUploadError,uploadProductImages } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/auth";
import { requireBrandAccess } from "../middlewares/brandAccess";
import { createProductController, deleteProductController, getProductByIdController, getProductsController, updateProductController } from "../controllers/product";

const router = Router();

router.post("/register", authMiddleware , uploadEbizRegistration, handleUploadError, registerBrand);
router.get("/:slug/access", authMiddleware , checkBrandAccess);

// ตรวจสอบสิทธิ์ก่อนเข้าถึง API สินค้าในร้าน
router.use("/:slug/products",authMiddleware,requireBrandAccess);

// Product Management
router.get("/:slug/products", getProductsController);
router.get("/:slug/products/:id", getProductByIdController);
router.post("/:slug/products",uploadProductImages, handleUploadError, createProductController);
router.put("/:slug/products/:id",uploadProductImages, handleUploadError, updateProductController);
router.delete("/:slug/products/:id", deleteProductController);
//BrandMember Management

router.use("/:slug/members",authMiddleware,requireBrandAccess);

router.get("/:slug/members",getBrandMembers);
router.post("/:slug/members",addBrandMember);
router.delete("/:slug/members",removeBrandMember);


export default router;