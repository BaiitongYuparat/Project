import { prisma } from "../../lib/prisma";

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