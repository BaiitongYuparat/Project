import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { getImageUrl } from "../utils/s3Utils";
import { deleteImage } from "../utils/s3Utils";
import { ProductImageQualityStatus } from "@prisma/client";

const publicProductImageSelect = {
    where: {
        quality_status: "PASSED"
    },
  select: {
    id: true,
    s3_key: true,
    sort_order: true,
  },
  orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  take: 10,
} satisfies Prisma.ProductImageFindManyArgs;

const shopProductImageSelect = {
  select: {
    id: true,
    s3_key: true,
    sort_order: true,
    quality_status: true,
    quality_reason: true,
  },
  orderBy: [
    { sort_order: "asc" },
    { id: "asc" },
  ],
} satisfies Prisma.ProductImageFindManyArgs;

type PublicImage = { id: string; sort_order: number; image_url: string | null };

const withImageUrls = async (
  images: { id: string; s3_key: string; sort_order: number, }[]
): Promise<PublicImage[]> => {
   return Promise.all(
    images.map(async ({ id, s3_key, sort_order }) => {
      try {
        return { id, sort_order, image_url: await getImageUrl(s3_key) };
      } catch (error) {
        console.error("Failed to build image url:", id, error);
        return { id, sort_order, image_url: null };
      }
    })
  );
};

type WithImageUrl<I> = Omit<I, "s3_key"> & { image_url: string | null };
const withProductImageUrls = async <
  T extends { images: { id: string; s3_key: string; sort_order: number }[] }
>(
  products: T[]
) => {
  return Promise.all(
    products.map(async (product) => ({
      ...product,
      images: await withImageUrls(product.images),
    }))
  );
};

const withShopImageUrls = async <I extends { id: string; s3_key: string }>(
  images: I[]
): Promise<WithImageUrl<I>[]> => {
  return Promise.all(
    images.map(async ({ s3_key, ...rest }) => {
      try {
        return { ...rest, image_url: await getImageUrl(s3_key) };
      } catch (error) {
        console.error("Failed to build image url:", rest.id, error);
        return { ...rest, image_url: null };
      }
    })
  );
};

const withShopProductImageUrls = async <
  T extends { images: { id: string; s3_key: string }[] }
>(
  products: T[]
): Promise<
  (Omit<T, "images"> & { images: WithImageUrl<T["images"][number]>[] })[]
> => {
  return Promise.all(
    products.map(async (product) => ({
      ...product,
      images: await withShopImageUrls(product.images),
    }))
  );
};

const assertOwnKeys = (brandId: string, images: { s3_key: string }[]) => {
  const prefix = `products/${brandId}/`;   // ปรับให้ตรงกับรูปแบบ key ที่คุณใช้
  for (const { s3_key } of images) {
    if (!s3_key.startsWith(prefix) || s3_key.includes("..")) {
      throw new Error("INVALID_IMAGE_KEY");
    }
  }
};


//------------------------------------------- Public (สำหรับลูกค้า)
// ดึงสินค้าทั้งหมดที่ลูกค้าสามารถมองเห็นได้
export const getPublicProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      is_active: true,
      brand: {
        status: "APPROVED",
      },
      images: {
        some: {},
        every: { quality_status: "PASSED" },
      }
    },
    select: {
      id: true,
      brand_id: true,
      name: true,
      category: true,
      price: true,
      description: true,
      created_at: true,
      images: publicProductImageSelect,
      brand: {
        select: {
          brand_name: true,
          slug: true,
        },
      },
    },
    orderBy: [
      { created_at: "desc" },
      { id: "desc" },
    ],
  });

  return withProductImageUrls(products);
};

// ดึงรายละเอียดสินค้า 1 รายการ
export const getPublicProduct = async (productId: string) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      is_active: true,
      brand: {
        status: "APPROVED",
      },
      images: {
        some: {},
        every: { quality_status: "PASSED" },
      }
    },
    select: {
      id: true,
      brand_id: true,
      name: true,
      category: true,
      price: true,
      description: true,
      created_at: true,
      updated_at: true,
      images: publicProductImageSelect,
      size_charts: true,
      brand: {
        select: {
          brand_name: true,
          slug: true,
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    images: await withImageUrls(product.images),
  };
};

//------------------------------------------- Shop Admin

// ดึงสินค้าทั้งหมดของ Brand
export const getProducts = async (brandId: string) => {
  const products = await prisma.product.findMany({
    where: {
      brand_id: brandId,
    },
    select: {
      id: true,
      brand_id: true,
      name: true,
      category: true,
      sku: true, 
      price: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      images: shopProductImageSelect,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  return withShopProductImageUrls(products);
};

// ดึงรายละเอียดสินค้าของ Brand พร้อม URL รูปภาพ

export const getProductById = async (
  brandId: string,
  productId: string
) => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      brand_id: brandId,
    },
    select: {
      id: true,
      brand_id: true,
      name: true,
      category: true,
      price: true,
      description: true,
      sku: true,
      is_active: true,
      created_at: true,
      updated_at: true,

      images: shopProductImageSelect,
      size_charts: true,
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    images: await withShopImageUrls(product.images),
    };
};


type CreateProductInput = {
  name: string;
  category: string;
  price?: number | null;
  description?: string | null;
  sku?: string | null;
  images: {
    s3_key: string;
    sort_order: number;
  }[];
};

// เพิ่มสินค้า
export const createProduct = async (
  brandId: string,
  data: CreateProductInput
) => {
  assertOwnKeys(brandId, data.images);
  return await prisma.product.create({
    data: {
      brand_id: brandId,
      name: data.name,
      category: data.category,
      price: data.price ?? null,
      description: data.description ?? null,
      sku: data.sku ?? null,
      images: {
        create: data.images,
      },
    },
    include: {
      images: true,
    },
  });
};

// แก้ไขสินค้า
type ProductImageInput = {
  s3_key: string;
  sort_order: number;
};


export const updateProductWithImages = async (
  brandId: string,
  productId: string,
  data: {
    name?: string;
    category?: string;
    price?: number | null;
    description?: string | null;
    sku?: string | null;
    is_active?: boolean;
  },
  newImages: ProductImageInput[],
  removeImageIds: string[]
) => {
  const result = await prisma.$transaction(async (tx) => {

    assertOwnKeys(brandId, newImages);
     // Lock สินค้าไว้ ป้องกันการแก้ไขพร้อมกัน
    const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM products
    WHERE id = ${productId}
      AND brand_id = ${brandId}
    FOR UPDATE
  `;

  if (locked.length === 0) {
    return null;
  }

    // ค้นหารูปที่ต้องการลบ โดยตรวจสอบว่าเป็นรูปของสินค้านี้จริง
    const imagesToRemove = removeImageIds.length
      ? await tx.productImage.findMany({
          where: {
            id: { in: removeImageIds },
            product_id: productId,
          },
          select: {
            id: true,
            s3_key: true,
          },
        })
      : [];

    if (imagesToRemove.length !== removeImageIds.length) {
      throw new Error("INVALID_IMAGE_IDS");
    }

    // ลบข้อมูลรูปจาก Database
    if (imagesToRemove.length > 0) {
      await tx.productImage.deleteMany({
        where: {
          id: { in: removeImageIds },
          product_id: productId,
        },
      });
    }

    // อัปเดตข้อมูลสินค้า
    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.is_active !== undefined && {
          is_active: data.is_active,
        }),
      },
    });

    // หาลำดับรูปภาพล่าสุด เพื่อเพิ่มรูปใหม่ต่อท้าย
    const lastImage = await tx.productImage.findFirst({
      where: {
        product_id: productId,
      },
      orderBy: {
        sort_order: "desc",
      },
      select: {
        sort_order: true,
      },
    });

    const startOrder = (lastImage?.sort_order ?? -1) + 1;

    // เพิ่มรูปใหม่
    const createdImages = [];

    for (const [index, image] of newImages.entries()) {
      const created = await tx.productImage.create({
        data: {
          product_id: productId,
          s3_key: image.s3_key,
          sort_order: startOrder + index,
        },
      });

      createdImages.push(created);
    }

    return {
      deletedKeys: imagesToRemove.map((image) => image.s3_key),
      newImages: createdImages,
    };
  });

  if (!result) {
    return null;
  }

  // ลบไฟล์เดิมออกจาก S3 หลัง Transaction สำเร็จ
  for (const key of result.deletedKeys) {
    try {
      await deleteImage(key);
    } catch (error) {
      console.error("Failed to delete image from S3:", key, error);
    }
  }

  // ดึงข้อมูลสินค้าใหม่พร้อม image_url
  const product = await getProductById(brandId, productId);

  return {
    product,
    newImages: result.newImages,
  };
};
// ลบสินค้า
export const deleteProduct = async (brandId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, brand_id: brandId },
    select: { id: true, images: { select: { s3_key: true } } },
  });
  if (!product) return null;

  await prisma.product.delete({ where: { id: productId } });

  for (const { s3_key } of product.images) {
    try {
      await deleteImage(s3_key);
    } catch (error) {
      console.error("Failed to delete image from S3:", s3_key, error);
    }
  }

  return { id: productId };
};



export type ProductQuality = "PASS" | "FAIL" | "REVIEW" | "PENDING";
// สรุปผลตรวจระดับสินค้า จากสถานะของรูปทุกรูป
const summarizeQuality = (
  statuses: ProductImageQualityStatus[]
): ProductQuality => {
  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAIL";
  if (statuses.includes("PENDING")) return "PENDING";
  return "PASS";
};

// รายการสินค้าทุกร้าน สำหรับ Super Admin
export const getAdminProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { created_at: "desc" },
    include: {
      brand: { select: { id: true, brand_name: true } },
      images: {
        orderBy: { sort_order: "asc" },
        select: { s3_key: true, quality_status: true },
      },
    },
  });

  return Promise.all(
    products.map(async (p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      is_active: p.is_active,
      brand: { id: p.brand.id, name: p.brand.brand_name },
      thumbnail: p.images[0] ? await getImageUrl(p.images[0].s3_key) : null,
      quality: summarizeQuality(p.images.map((i) => i.quality_status)),
    }))
  );
};

// นับจำนวนสินค้าตามสถานะผลตรวจ สำหรับการ์ดสถิติด้านบนของหน้า
export const getAdminProductStats = async () => {
  const products = await prisma.product.findMany({
    select: { images: { select: { quality_status: true } } },
  });

  const stats = { total: products.length, pass: 0, fail: 0, review: 0 };

  for (const p of products) {
    const q = summarizeQuality(p.images.map((i) => i.quality_status));
    if (q === "PASS") stats.pass++;
    else if (q === "FAIL") stats.fail++;
    else if (q === "REVIEW") stats.review++;
  }

  return stats;
};

