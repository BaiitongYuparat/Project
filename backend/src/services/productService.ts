import { prisma } from "../../lib/prisma";
import { getImageUrl } from "../utils/s3Utils";
import { deleteImage } from "../utils/s3Utils";

//------------------------------------------- Public
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
      price: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      images: {
        select: {
          id: true,
          s3_key: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return products;
};

// ดึงสินค้าทั้งหมดที่ลูกค้าสามารถมองเห็นได้
export const getPublicProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      is_active: true,
      brand: {
        status: "APPROVED",
      },
    },
    select: {
      id: true,
      brand_id: true,
      name: true,
      category: true,
      price: true,
      description: true,
      created_at: true,
      images: {
        select: {
          id: true,
          s3_key: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
      brand: {
        select: {
          brand_name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return products;
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
      images: {
        select: {
          id: true,
          s3_key: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },
      size_charts: true,
      brand: {
        select: {
          brand_name: true,
          slug: true,
        },
      },
    },
  });

  return product;
};

//------------------------------------------- Shop Admin
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

      images: {
        select: {
          id: true,
          s3_key: true,
          sort_order: true,
          quality_status: true,
          quality_reason: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      },

      size_charts: true,
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    images: await Promise.all(
      product.images.map(async (image) => ({
        ...image,
        image_url: await getImageUrl(image.s3_key),
      }))
    ),
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
export const updateProduct = async (
  brandId: string,
  productId: string,
  data: {
    name?: string;
    category?: string;
    price?: number | string | null;
    description?: string | null;
    sku?: string | null;
    is_active?: boolean;
  }
) => {
  // ตรวจสอบก่อนว่าสินค้าเป็นของ Brand นี้จริง
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      brand_id: brandId,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    return null;
  }

  return await prisma.product.update({
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
};

// ลบสินค้า
export const deleteProduct = async (
  brandId: string,
  productId: string
) => {
  const result = await prisma.product.deleteMany({
    where: {
      id: productId,
      brand_id: brandId,
    },
  });

  return getProductById(brandId, productId);
};

// ดึงสินค้าทั้งหมดของ Brand พร้อม URL รูปภาพ
export const getProductsWithImageUrls = async (brandId: string) => {
  const products = await getProducts(brandId);

  return Promise.all(
    products.map(async (product) => ({
      ...product,
      images: await Promise.all(
        product.images.map(async (image) => ({
          ...image,
          image_url: await getImageUrl(image.s3_key),
        }))
      ),
    }))
  );
};

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
    // ตรวจสอบว่าสินค้าเป็นของ Brand นี้
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        brand_id: brandId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
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