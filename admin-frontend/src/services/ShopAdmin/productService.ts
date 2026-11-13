import api from "../api";
import {
  cachedQuery,
  invalidate,
} from "../cache";
import type {
  Product,
  ProductFormData,
  ProductGender,
  ProductOptions,
  ProductSummary,
  SizeChartTemplate,
} from "../../types/product";

// ---------- TTL ของ cache ----------

const PRODUCTS_TTL_MS = 30_000; // รายการสินค้า — stale-while-revalidate 30 วิ
const PLATFORM_CONFIG_TTL_MS = 30 * 60 * 1000; // template/ตัวเลือกของแพลตฟอร์ม — แก้ยาก เก็บ 30 นาที

// ---------- cache keys ----------

const productsKey = (slug: string) => `products:${slug}`;
const templatesKey = (params?: {
  gender?: ProductGender;
  category?: string;
}) => `templates:${params?.gender ?? ""}:${params?.category ?? ""}`;
const productOptionsKey = "product-options";

// ---------- API ----------

// ดึงสินค้าทั้งหมดของร้าน (cache 30 วิ — stale-while-revalidate)
export const getProducts = (
  slug: string,
  opts: { force?: boolean } = {},
): Promise<ProductSummary[]> =>
  cachedQuery(
    productsKey(slug),
    async () => {
      const response = await api.get(`/brands/${slug}/products`);

      return response.data.products as ProductSummary[];
    },
    PRODUCTS_TTL_MS,
    opts,
  );

// หลัง mutation สินค้า — mark รายการเก่าเป็น stale (ยังแสดงได้ระหว่าง refetch)
export const invalidateProducts = (slug: string) =>
  invalidate(productsKey(slug), { keepStale: true });

// ดึงสินค้า 1 รายการ (ไม่ cache — ฟอร์มแก้ไขต้องได้ข้อมูลสด)
export const getProductById = async (
  slug: string,
  productId: string
): Promise<Product> => {
  const response = await api.get(
    `/brands/${slug}/products/${productId}`
  );

  return response.data.product;
};

// ส่งรูปที่ FAILED กลับเข้าคิวตรวจคุณภาพใหม่ (AI ตรวจเบื้องหลัง, cooldown 30 วิ ฝั่งเซิร์ฟเวอร์)
export const recheckProductImage = async (
  slug: string,
  productId: string,
  imageId: string
): Promise<void> => {
  await api.post(
    `/brands/${slug}/products/${productId}/images/${imageId}/recheck`
  );

  // สถานะรูปจะกลายเป็น PENDING — list ต้องโหลดใหม่เพื่อเห็นสถานะล่าสุด
  invalidateProducts(slug);
};

// ดึงตารางไซส์ standard ของแพลตฟอร์ม (filter ตาม gender/category ได้ — key แยกตาม params)
export const getSizeChartTemplates = (
  params?: {
    gender?: ProductGender;
    category?: string;
  },
  opts: { force?: boolean } = {},
): Promise<SizeChartTemplate[]> =>
  cachedQuery(
    templatesKey(params),
    async () => {
      const response = await api.get("/brands/size-chart-templates", {
        params: {
          ...(params?.gender && { gender: params.gender }),
          ...(params?.category && { category: params.category }),
        },
      });

      return response.data.templates as SizeChartTemplate[];
    },
    PLATFORM_CONFIG_TTL_MS,
    opts,
  );

// ดึงชุดตัวเลือกฤดู/โอกาส ที่แพลตฟอร์มกำหนด
export const getProductOptions = (
  opts: { force?: boolean } = {},
): Promise<ProductOptions> =>
  cachedQuery(
    productOptionsKey,
    async () => {
      const response = await api.get("/brands/product-options");

      return response.data.options as ProductOptions;
    },
    PLATFORM_CONFIG_TTL_MS,
    opts,
  );

// ---------- FormData helpers ----------

const appendCommonFields = (
  formData: FormData,
  data: ProductFormData
) => {
  formData.append("name", data.name);
  formData.append("category", data.category);
  formData.append("gender", data.gender);
  formData.append("fabric", data.fabric);
  formData.append("seasons", JSON.stringify(data.seasons));
  formData.append("occasions", JSON.stringify(data.occasions));
  formData.append("price", data.price);
  formData.append("description", data.description);
  formData.append("sku", data.sku);
  formData.append("is_active", String(data.is_active));

  // อ้างอิงตารางไซส์กลางของร้าน (ถ้าไม่อ้างอิง → ส่ง rows ตารางเฉพาะตัว)
  if (data.size_chart_id) {
    formData.append("size_chart_id", data.size_chart_id);
  } else {
    formData.append(
      "size_chart",
      JSON.stringify(
        data.size_chart.map((row) => ({
          size: row.size,
          chest: row.chest === "" ? null : row.chest,
          waist: row.waist === "" ? null : row.waist,
          hips: row.hips === "" ? null : row.hips,
          length: row.length === "" ? null : row.length,
        }))
      )
    );
  }

  // สี (ไม่รวมกลุ่มรูปเดิมที่ยังไม่มีสี)
  const colors = data.colors.filter(
    (color) => !color.legacy && (color.id || color.name.trim())
  );

  formData.append(
    "colors",
    JSON.stringify(
      colors.map((color) => ({
        ...(color.id ? { id: color.id } : {}),
        name: color.name.trim(),
        hex: color.hex.trim() || null,
      }))
    )
  );

  // ไฟล์รูปใหม่ + view + ตำแหน่งสี (parallel arrays)
  colors.forEach((color, colorIndex) => {
    color.new_images.forEach((image) => {
      formData.append("images", image.file);
      formData.append("views", image.view);
      formData.append("color_indexes", String(colorIndex));
      // ชนิดรูปของสินค้าแบบชุด เช่น set (SET/TOP/BOTTOM, ค่าว่าง = ไม่ระบุ)
      formData.append("pieces", image.piece ?? "");
    });
  });

  return colors;
};

// เพิ่มสินค้า
export const createProduct = async (
  slug: string,
  data: ProductFormData
) => {
  const formData = new FormData();

  appendCommonFields(formData, data);

  const response = await api.post(
    `/brands/${slug}/products`,
    formData
  );

  // รายการสินค้าเปลี่ยน — mark stale ให้หน้า list โหลดใหม่
  invalidateProducts(slug);

  return response;
};

// แก้ไขสินค้า
export const updateProduct = async (
  slug: string,
  productId: string,
  data: ProductFormData,
  remove_color_ids: string[] = []
) => {
  const formData = new FormData();

  appendCommonFields(formData, data);

  const removedImageIds = data.colors.flatMap(
    (color) => color.removed_image_ids
  );

  formData.append(
    "remove_image_ids",
    JSON.stringify(removedImageIds)
  );

  formData.append(
    "remove_color_ids",
    JSON.stringify(remove_color_ids)
  );

  const response = await api.put(
    `/brands/${slug}/products/${productId}`,
    formData
  );

  invalidateProducts(slug);

  return response;
};

// ลบสินค้า
export const deleteProduct = async (
  slug: string,
  productId: string
) => {
  const response = await api.delete(
    `/brands/${slug}/products/${productId}`
  );

  invalidateProducts(slug);

  return response;
};