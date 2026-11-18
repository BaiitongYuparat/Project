import { Router } from "express";

import { getPublicProductsController, getPublicProductByIdController,} from "../controllers/product";
import { getBrands } from "../controllers/brand";
import { getPublicModels } from "../controllers/model";

const router = Router();

router.get("/shops" , getBrands)
// Public Products
router.get("/products", getPublicProductsController);
router.get("/products/:productId", getPublicProductByIdController);
// โมเดลสำหรับหน้า Try-On Studio
router.get("/models", getPublicModels);

export default router;