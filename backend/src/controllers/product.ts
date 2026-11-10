
import { Request, Response } from "express";
import { createProduct, deleteProduct, getProductById, getProducts, getPublicProduct, getPublicProducts, updateProduct, updateProductWithImages , getAdminProducts , getAdminProductStats} from "../services/productService";
import { BrandAccessError } from "../services/brandAccessService";
import { processProductImageQuality } from "../services/productImageQuality";
import { deleteImage } from "../utils/s3Utils";
import { ImageView } from "@prisma/client";

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

    return res.status(200).json({product});
  } catch (error) {
    console.error("Get public product error:", error);

    return res.status(500).json({
      message: "Failed to fetch public product",
    });
  }
};

//------ Shop Admin ------//

//ดึงข้อมูลรวมรูป
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

    console.dir(
    products.map((p) => ({
        id: p.id,
        images: p.images.map((img) => ({
        id: img.id,
        quality_status: img.quality_status,
        quality_reason: img.quality_reason,
        })),
    })),
    { depth: null }
    );

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
// GET /brands/:slug/products/:id
export const getProductByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (typeof id !== "string") {
    return res.status(400).json({
        message: "Invalid product ID",
    });
    }

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const product = await getProductById(brandId, id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

// POST /brands/:slug/products
export const createProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const { name, category, price, description, sku } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        message: "Product name and category are required",
      });
    }

    if (
      price !== undefined &&
      price !== null &&
      (!Number.isFinite(Number(price)) || Number(price) < 0)
    ) {
      return res.status(400).json({ message: "Invalid product price" });
    }


    // รับไฟล์รูปภาพจาก Multer
    const files = (req.files ?? []) as (
      Express.Multer.File & { key: string }
    )[];

    if (files.length === 0) {
      return res.status(400).json({
        message: "At least one product image is required",
      });
    }
    const rawViews = req.body.views;

    const views = Array.isArray(rawViews)
    ? rawViews
    : rawViews
        ? [rawViews]
        : [];
    console.log("uploaded keys:", files.map((f) => f.key), "brandId:", brandId);
    if (views.length !== files.length) {
    throw new Error("IMAGE_VIEW_COUNT_MISMATCH");
    }

    const product = await createProduct(brandId, {
      name: name.trim(),
      category: category.trim(),
      price: price === "" ? null : price,
      description: description?.trim() || null,
      sku: sku?.trim() || null,
      images: files.map((file, index) => ({
        s3_key: file.key,
        sort_order: index,
        view: views[index],
      })),
    });

    // ส่งรูปไปตรวจสอบคุณภาพด้วย Gemini แบบไม่รอผล
    for (const [index, file] of files.entries()) {
      const image = product.images[index];

      if (image) {
        void processProductImageQuality({
          imageId: image.id,
          productId: product.id,
          key: file.key,
          mimeType: file.mimetype,
          view: image.view,
        }).catch((error) => {
        console.error("Product image quality check error:", error);
        });
      }
    }

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error: any) {
    console.error("Create product error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This SKU already exists in your store",
      });
    }

    return res.status(500).json({ message: "Failed to create product" });
  }
};


// PUT /brands/:slug/products/:id
export const updateProductController = async (
  req: Request,
  res: Response
) => {
  // ไฟล์ที่ Multer อัปโหลดเข้า S3 แล้ว
  const files = (req.files ?? []) as (Express.Multer.File & {
    key: string;
  })[];

  let success = false;

  try {
    const brandId = req.brand?.id;
    const id = req.params.id;
    const rawViews = req.body.views;

    const views: ImageView[] = Array.isArray(rawViews)
    ? rawViews
    : rawViews
        ? [rawViews]
        : [];

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const {
      name,
      category,
      price,
      description,
      sku,
      is_active,
    } = req.body;

    // ตรวจสอบชื่อสินค้า
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "Invalid product name",
      });
    }

    // ตรวจสอบหมวดหมู่
    if (
      category !== undefined &&
      (typeof category !== "string" || !category.trim())
    ) {
      return res.status(400).json({
        message: "Invalid product category",
      });
    }

    // แปลงและตรวจสอบราคา
    const parsedPrice =
      price === undefined
        ? undefined
        : price === "" || price === null
          ? null
          : Number(price);

    if (
      parsedPrice !== undefined &&
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      return res.status(400).json({
        message: "Invalid product price",
      });
    }

    // ตรวจสอบรายละเอียด
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid product description",
      });
    }

    // ตรวจสอบ SKU
    if (
      sku !== undefined &&
      sku !== null &&
      typeof sku !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid product SKU",
      });
    }

    // แปลง is_active จาก FormData ให้เป็น Boolean
    let parsedIsActive: boolean | undefined;

    if (is_active !== undefined) {
      if (
        is_active !== "true" &&
        is_active !== "false" &&
        typeof is_active !== "boolean"
      ) {
        return res.status(400).json({
          message: "Invalid product status",
        });
      }

      parsedIsActive =
        is_active === true || is_active === "true";
    }

    // อ่าน ID ของรูปภาพเดิมที่ต้องการลบ
    let removeImageIds: string[] = [];

    if (req.body.remove_image_ids !== undefined) {
      try {
        removeImageIds = JSON.parse(
          req.body.remove_image_ids
        );

        if (
          !Array.isArray(removeImageIds) ||
          !removeImageIds.every(
            (imageId) => typeof imageId === "string"
          ) ||
          new Set(removeImageIds).size !== removeImageIds.length
        ) {
          throw new Error("Invalid image IDs");
        }
      } catch {
        return res.status(400).json({
          message: "Invalid remove_image_ids",
        });
      }
    }

    // เรียก Service เพื่อแก้ไขสินค้าและรูปภาพ
    const result = await updateProductWithImages(
      brandId,
      id,
      {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(category !== undefined && {
          category: category.trim(),
        }),

        ...(price !== undefined && {
          price: parsedPrice,
        }),

        ...(description !== undefined && {
          description:
            description === null
              ? null
              : description.trim() || null,
        }),

        ...(sku !== undefined && {
          sku:
            sku === null
              ? null
              : sku.trim() || null,
        }),

        ...(is_active !== undefined && {
          is_active: parsedIsActive!,
        }),
      },
      files.map((file, index) => ({
        s3_key: file.key,
        sort_order: index,
        view: views[index],
      })),
      removeImageIds
    );

    if (!result) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // บันทึกสำเร็จ ไม่ต้อง cleanup รูปใหม่
    success = true;

    // ตรวจสอบคุณภาพรูปภาพใหม่
    for (const [index, file] of files.entries()) {
      const image = result.newImages[index];

      if (image) {
        void processProductImageQuality({
          imageId: image.id,
          productId: id,
          key: file.key,
          mimeType: file.mimetype,
          view: image.view,
        }).catch((error) => {
          console.error(
            "Product image quality check error:",
            error
          );
        });
      }
    }

    return res.status(200).json({
      message: "Product updated successfully",
      product: result.product,
    });

  } catch (error: any) {
    console.error("Update product error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This SKU already exists in your store",
      });
    }

    if (error.message === "INVALID_IMAGE_IDS") {
      return res.status(400).json({
        message: "Invalid image IDs",
      });
    }

    return res.status(500).json({
      message: "Failed to update product",
    });

  } finally {
    // หากการอัปเดตไม่สำเร็จ ให้ลบรูปใหม่ที่อัปโหลดค้างไว้
    if (!success) {
      await Promise.all(
        files.map((file) =>
          deleteImage(file.key).catch((error) => {
            console.error(
              "S3 cleanup error:",
              file.key,
              error
            );
          })
        )
      );
    }
  }
};



// DELETE /brands/:slug/products/:id
export const deleteProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (typeof id !== "string") {
    return res.status(400).json({
        message: "Invalid product ID",
    });
    }

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const deleted = await deleteProduct(brandId, id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
};

// ส่งรายการสินค้าทุกร้านให้ Super Admin
export const getAdminProductsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const products = await getAdminProducts();
    return res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get admin products error:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

// ส่งตัวเลขสรุปสถานะผลตรวจรูปสำหรับการ์ดสถิติ
export const getAdminProductStatsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const stats = await getAdminProductStats();
    return res.status(200).json({
      message: "Stats fetched successfully",
      stats,
    });
  } catch (error) {
    console.error("Get admin product stats error:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};

