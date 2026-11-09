import { Router } from "express";

import { getPublicProductsController, getPublicProductByIdController,} from "../controllers/product";
import { getBrands } from "../controllers/brand";

const router = Router();

router.get("/shops" , getBrands)
// Public Products
router.get("/products", getPublicProductsController);
router.get("/products/:productId", getPublicProductByIdController);

export default router;