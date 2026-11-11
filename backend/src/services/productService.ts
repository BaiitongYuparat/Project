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
    view:true,
  },
  orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  take: 10,
} satisfies Prisma.ProductImageFindManyArgs;

const shopProductImageSelect = {
  select: {
    id: true,
    color_id: true,
    s3_key: true,
    sort_order: true,
    view: true,
    quality_status: true,
    quality_reason: true,
  },
  orderBy: [
    { sort_order: "asc" },
    { id: "asc" },
  ],
} satisfies Prisma.ProductImageFindManyArgs;

// สี + รูปต่อสี สำหรับฝั่ง shop admin
const shopProductColorSelect = {
  orderBy: { created_at: "asc" as const },
  select: {
    id: true,
    name: true,
    hex: true,
    images: shopProductImageSelect,
  },
};

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

// รูปแบบข้อมูลที่รับเข้า/ส่งออกของ shop product (รูปต้องมี s3_key ก่อนแปลงเป็น URL)
type ShopImageInput = { id: string; s3_key: string };
type ShopColorInput = {
  id: string;
  name: string;
  hex: string | null;
  images: ShopImageInput[];
};

const withShopProductImageUrls = async <
  I extends ShopImageInput,
  C extends { id: string; name: string; hex: string | null; images: I[] },
  T extends { images: I[]; colors: C[] }
>(
  products: T[]
) => {
  return Promise.all(
    products.map(async ({ images, colors, ...rest }) => ({
      ...rest,
      images: await withShopImageUrls(images),
      colors: await Promise.all(
        colors.map(async (color) => ({
          ...color,
          images: await withShopImageUrls(color.images),
        }))
      ),
    }))
  );
};

const assertOwnKeys = (brandId: string, images: { s3_key: string}[]) => {
  const prefix = `brand-products/${brandId}/`;
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
      // สินค้าจะถูกแสดงหากมีอย่างน้อย 1 รูปผ่าน QC (แสดงเฉพาะรูปที่ PASSED)
      images: {
        some: { quality_status: "PASSED" },
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
      // สินค้าจะถูกแสดงหากมีอย่างน้อย 1 รูปผ่าน QC (แสดงเฉพาะรูปที่ PASSED)
      images: {
        some: { quality_status: "PASSED" },
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
      gender: true,
      fabric: true,
      seasons: true,
      occasions: true,
      price: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      images: shopProductImageSelect,
      colors: shopProductColorSelect,
      size_chart_id: true,
      // ตารางกลางที่อ้างอิง (frontend เลือก entry ตาม category ของสินค้า)
      size_chart: {
        select: {
          id: true,
          name: true,
          gender: true,
          entries: {
            orderBy: { category: "asc" },
            include: {
              rows: {
                orderBy: { sort_order: "asc" },
              },
            },
          },
        },
      },
      size_charts: {
        orderBy: { size: "asc" },
      },
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
      gender: true,
      fabric: true,
      seasons: true,
      occasions: true,
      price: true,
      description: true,
      sku: true,
      is_active: true,
      created_at: true,
      updated_at: true,

      images: shopProductImageSelect,
      colors: shopProductColorSelect,
      size_chart_id: true,
      size_chart: {
        select: {
          id: true,
          name: true,
          gender: true,
          entries: {
            orderBy: { category: "asc" },
            include: {
              rows: {
                orderBy: { sort_order: "asc" },
              },
            },
          },
        },
      },
      size_charts: {
        orderBy: { size: "asc" },
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...product,
    images: await withShopImageUrls(product.images),
    colors: await Promise.all(
      product.colors.map(async (color) => ({
        ...color,
        images: await withShopImageUrls(color.images),
      }))
    ),
    };
};


type ProductImageInput = {
  s3_key: string;
  sort_order: number;
  view: "FRONT" | "BACK" | "LEFT" | "RIGHT";
};

type SizeChartRowInput = {
  size: string;
  chest?: number | string | null;
  waist?: number | string | null;
  hips?: number | string | null;
  length?: number | string | null;
};

type ProductColorInput = {
  name: string;
  hex?: string | null;
  images: ProductImageInput[];
};

type CreateProductInput = {
  name: string;
  category: string;
  gender?: "UNISEX" | "MALE" | "FEMALE";
  fabric?: string | null;
  seasons?: string[];
  occasions?: string[];
  price?: number | null;
  description?: string | null;
  sku?: string | null;
  // อ้างอิงตารางไซส์กลางของร้าน (สำคัญกว่า size_chart ถ้าส่งมาพร้อมกัน)
  size_chart_id?: string | null;
  size_chart?: SizeChartRowInput[];
  colors: ProductColorInput[];
};

// แปลงค่าจาก body เป็น Decimal ที่ Prisma ยอมรับ
const toDecimal = (value: unknown): Prisma.Decimal | null => {
  if (value === undefined || value === null || value === "") return null;

  const num = Number(value);

  return Number.isFinite(num) ? new Prisma.Decimal(num) : null;
};

const sizeChartRowsData = (rows: SizeChartRowInput[]) =>
  rows
    .filter((row) => typeof row.size === "string" && row.size.trim())
    .map((row) => ({
      size: row.size.trim(),
      chest: toDecimal(row.chest),
      waist: toDecimal(row.waist),
      hips: toDecimal(row.hips),
      length: toDecimal(row.length),
    }));

// เพิ่มสินค้า (สร้างสี + รูปต่อสี + ตารางไซส์ ใน transaction เดียว)
export const createProduct = async (
  brandId: string,
  data: CreateProductInput
) => {
  const allImages = data.colors.flatMap((color) => color.images);
  assertOwnKeys(brandId, allImages);

  const productWithDetails = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        brand_id: brandId,
        name: data.name,
        category: data.category,
        gender: data.gender ?? "UNISEX",
        fabric: data.fabric ?? null,
        seasons: data.seasons ?? [],
        occasions: data.occasions ?? [],
        price: data.price ?? null,
        description: data.description ?? null,
        sku: data.sku ?? null,
        // อ้างอิงตารางกลาง (ถ้าไม่มี → ใช้ตารางเฉพาะตัวด้านล่าง)
        ...(data.size_chart_id && { size_chart_id: data.size_chart_id }),
        ...(!data.size_chart_id &&
          data.size_chart &&
          data.size_chart.length > 0 && {
            size_charts: {
              create: sizeChartRowsData(data.size_chart),
            },
          }),
      },
    });

    for (const color of data.colors) {
      const createdColor = await tx.productColor.create({
        data: {
          product_id: product.id,
          name: color.name,
          hex: color.hex ?? null,
        },
      });

      for (const image of color.images) {
        await tx.productImage.create({
          data: {
            product_id: product.id,
            color_id: createdColor.id,
            s3_key: image.s3_key,
            sort_order: image.sort_order,
            view: image.view,
          },
        });
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        images: true,
        colors: {
          include: {
            images: true,
          },
        },
        size_chart: {
          include: {
            entries: {
              include: {
                rows: true,
              },
            },
          },
        },
        size_charts: true,
      },
    });
  }, { timeout: 20000, maxWait: 5000 });

  return productWithDetails;
};

// แก้ไขสินค้า
export type UpdateProductInput = {
  name?: string;
  category?: string;
  gender?: "UNISEX" | "MALE" | "FEMALE";
  fabric?: string | null;
  seasons?: string[];
  occasions?: string[];
  price?: number | null;
  description?: string | null;
  sku?: string | null;
  is_active?: boolean;
  // อ้างอิงตารางกลาง (สำคัญกว่า size_chart ถ้าส่งมาพร้อมกัน)
  size_chart_id?: string | null;
};

type UpdateProductPayload = {
  data: UpdateProductInput;
  newImages: (ProductImageInput & { color_index: number })[];
  colors: { id?: string; name: string; hex?: string | null }[];
  removeImageIds: string[];
  removeColorIds: string[];
  size_chart?: SizeChartRowInput[];
};

export const updateProductWithImages = async (
  brandId: string,
  productId: string,
  payload: UpdateProductPayload
) => {
  const { data, newImages, colors, removeImageIds, removeColorIds, size_chart } =
    payload;

  const result = await prisma.$transaction(
    async (tx) => {
    assertOwnKeys(
      brandId,
      newImages.map(({ color_index, ...image }) => image)
    );
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

    // สีที่จะลบ — ตรวจว่าเป็นสีของสินค้านี้จริง (รูปถูก cascade ลบตาม)
    const colorsToRemove = removeColorIds.length
      ? await tx.productColor.findMany({
          where: {
            id: { in: removeColorIds },
            product_id: productId,
          },
          select: { id: true },
        })
      : [];

    if (colorsToRemove.length !== removeColorIds.length) {
      throw new Error("INVALID_COLOR_IDS");
    }

    // ลบสี (รูปในสีถูกลบตามด้วย onDelete: Cascade)
    if (colorsToRemove.length > 0) {
      await tx.productColor.deleteMany({
        where: {
          id: { in: removeColorIds },
          product_id: productId,
        },
      });
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
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.fabric !== undefined && { fabric: data.fabric }),
        ...(data.seasons !== undefined && { seasons: data.seasons }),
        ...(data.occasions !== undefined && { occasions: data.occasions }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.is_active !== undefined && {
          is_active: data.is_active,
        }),
        // อ้างอิงตารางกลาง → เคลียร์ตารางเฉพาะตัวเดิมด้วย
        ...(data.size_chart_id !== undefined && {
          size_chart_id: data.size_chart_id || null,
          ...(data.size_chart_id && {
            size_charts: {
              deleteMany: {},
            },
          }),
        }),
        // โหมดตารางเฉพาะตัว: แทนที่ rows ทั้งชุด และเลิกอ้างอิงตารางกลาง
        ...(size_chart !== undefined && {
          size_chart_id: null,
          size_charts: {
            deleteMany: {},
            ...(size_chart.length > 0 && {
              create: sizeChartRowsData(size_chart),
            }),
          },
        }),
      },
    });

    // สร้างสีใหม่ (ไม่มี id) และจำ mapping ตำแหน่ง -> color_id
    const colorIdByIndex = new Map<number, string>();

    for (const [index, color] of colors.entries()) {
      if (color.id) {
        // สีเดิม — ตรวจว่าเป็นสีของสินค้านี้จริง แล้วอัปเดตชื่อ/โค้ดสี
        const existing = await tx.productColor.findFirst({
          where: {
            id: color.id,
            product_id: productId,
          },
          select: { id: true },
        });

        if (!existing) {
          throw new Error("INVALID_COLOR_IDS");
        }

        await tx.productColor.update({
          where: { id: color.id },
          data: {
            name: color.name,
            ...(color.hex !== undefined ? { hex: color.hex ?? null } : {}),
          },
        });

        colorIdByIndex.set(index, color.id);
      } else {
        const created = await tx.productColor.create({
          data: {
            product_id: productId,
            name: color.name,
            hex: color.hex ?? null,
          },
        });

        colorIdByIndex.set(index, created.id);
      }
    }

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

    let startOrder = (lastImage?.sort_order ?? -1) + 1;

    // เพิ่มรูปใหม่ (ผูกกับสีตาม color_index)
    const createdImages = [];

    for (const [index, image] of newImages.entries()) {
      const colorId = colorIdByIndex.get(image.color_index);

      if (!colorId) {
        throw new Error("INVALID_COLOR_INDEX");
      }

      const created = await tx.productImage.create({
        data: {
          product_id: productId,
          color_id: colorId,
          s3_key: image.s3_key,
          sort_order: startOrder + index,
          view: image.view,
        },
      });

      createdImages.push(created);
      startOrder += 1;
    }

    return {
      deletedKeys: imagesToRemove.map((image) => image.s3_key),
      newImages: createdImages,
    };
  }, { timeout: 20000, maxWait: 5000 });

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



export type ProductQuality = ProductImageQualityStatus
// สรุปผลตรวจระดับสินค้า จากสถานะของรูปทุกรูป
const summarizeQuality = (
  statuses: ProductImageQualityStatus[]
): ProductQuality => {
  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("PENDING")) return "PENDING";
  return "PASSED";
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

  const stats = { total: products.length, pass: 0, fail: 0, pending: 0 };

  for (const p of products) {
    const q = summarizeQuality(p.images.map((i) => i.quality_status));
    if (q === "PASSED") stats.pass++;
    else if (q === "FAILED") stats.fail++;
    else stats.pending++;
  }

  return stats;
};

//------------------------------------------- ตารางไซส์ standard + ตัวเลือกฤดู/โอกาส

// ตารางไซส์ standard — filter ตาม gender/category ที่ส่งมาได้
export const getSizeChartTemplates = async (params?: {
  gender?: "UNISEX" | "MALE" | "FEMALE";
  category?: string;
}) => {
  const templates = await prisma.sizeChartTemplate.findMany({
    where: {
      // gender: template ของเพศนั้น + unisex ใช้ได้เสมอ
      ...(params?.gender && {
        gender: {
          in: [params.gender, "UNISEX"],
        },
      }),
      // category: template ของหมวดนั้น + template ที่ไม่ได้ระบุหมวด (ใช้ได้ทุกหมวด)
      ...(params?.category && {
        OR: [{ category: params.category }, { category: null }],
      }),
    },
    orderBy: [{ gender: "asc" }, { name: "asc" }],
    include: {
      rows: {
        orderBy: { sort_order: "asc" },
      },
    },
  });

  return templates;
};

// ชุดตัวเลือกฤดู/โอกาส ที่ใช้งานอยู่
export const getProductOptions = async () => {
  const options = await prisma.productOption.findMany({
    where: { is_active: true },
    orderBy: [{ type: "asc" }, { sort_order: "asc" }],
  });

  return {
    seasons: options
      .filter((option) => option.type === "SEASON")
      .map((option) => option.label),
    occasions: options
      .filter((option) => option.type === "OCCASION")
      .map((option) => option.label),
  };
};

