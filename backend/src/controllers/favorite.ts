import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  getFavoriteProducts,
  isPublicProductVisible,
} from "../services/productService";

// GET /favorites — รายการโปรดพร้อมข้อมูลสินค้า (ใช้แสดงในหน้า My Outfit)
export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const products = await getFavoriteProducts(userId);

    return res.status(200).json({ products });
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({ message: "Failed to fetch favorites" });
  }
};

// GET /favorites/ids — เฉพาะ id (เบา ใช้เช็คสถานะหัวใจในหน้า list)
export const getFavoriteIds = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const favorites = await prisma.favorite.findMany({
      where: { user_id: userId },
      select: { product_id: true },
      orderBy: { created_at: "desc" },
    });

    return res
      .status(200)
      .json({ ids: favorites.map((favorite) => favorite.product_id) });
  } catch (error) {
    console.error("Get favorite ids error:", error);
    return res.status(500).json({ message: "Failed to fetch favorites" });
  }
};

// POST /favorites { product_id } — เพิ่มรายการโปรด (กดซ้ำได้ ไม่ error)
export const addFavorite = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { product_id: productId } = req.body as { product_id?: unknown };

    if (typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    // เพิ่มได้เฉพาะสินค้าที่ยังขายอยู่และลูกค้ามองเห็น
    const visible = await isPublicProductVisible(productId);

    if (!visible) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.favorite.upsert({
      where: {
        user_id_product_id: { user_id: userId, product_id: productId },
      },
      create: { user_id: userId, product_id: productId },
      update: {},
    });

    return res.status(201).json({ favorited: true, product_id: productId });
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({ message: "Failed to add favorite" });
  }
};

// DELETE /favorites/:productId — เอาออกจากรายการโปรด (ลบซ้ำได้ ไม่ error)
export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;

    if (typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    await prisma.favorite.deleteMany({
      where: { user_id: userId, product_id: productId },
    });

    return res.status(200).json({ favorited: false, product_id: productId });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({ message: "Failed to remove favorite" });
  }
};
