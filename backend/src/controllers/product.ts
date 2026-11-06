
import { Request, Response } from "express";
import { getProducts, getPublicProduct, getPublicProducts } from "../services/productService";
import { BrandAccessError } from "../services/brandAccessService";

export const getProductsController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    const products = await getProducts(brandId);

    return res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

// GET /products
export const getPublicProductsController = async (
  req: Request,
  res: Response
) => {
  try {
    const products = await getPublicProducts();

    return res.status(200).json({
      message: "Public products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get public products error:", error);

    return res.status(500).json({
      message: "Failed to fetch public products",
    });
  }
};

// GET /products/:productId
export const getPublicProductByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { productId } = req.params;

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await getPublicProduct(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Public product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Get public product error:", error);

    return res.status(500).json({
      message: "Failed to fetch public product",
    });
  }
};