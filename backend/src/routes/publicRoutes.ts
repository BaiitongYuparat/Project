import { Router } from "express";

import { getPublicProductsController, getPublicProductByIdController,} from "../controllers/product";

const router = Router();

// Public Products
router.get("/products", getPublicProductsController);
router.get("/products/:productId", getPublicProductByIdController);

export default router;