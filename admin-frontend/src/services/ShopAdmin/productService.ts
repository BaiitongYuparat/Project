
import api from "../api";
import type {
  Product,
  ProductFormData,
  ProductGender,
  ProductOptions,
  SizeChartTemplate,
} from "../../types/product";

// ---------- API ----------

// ดึงสินค้าทั้งหมดของร้าน
export const getProducts = async (
  slug: string
): Promise<Product[]> => {
  const response = await api.get(`/brands/${slug}/products`);

  return response.data.products;
};

// ดึงสินค้า 1 รายการ
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
};

// ดึงตารางไซส์ standard ของแพลตฟอร์ม (filter ตาม gender/category ได้)
export const getSizeChartTemplates = async (params?: {
  gender?: ProductGender;
  category?: string;
}): Promise<SizeChartTemplate[]> => {
  const response = await api.get("/brands/size-chart-templates", {
    params: {
      ...(params?.gender && { gender: params.gender }),
      ...(params?.category && { category: params.category }),
    },
  });

  return response.data.templates;
};

// ดึงชุดตัวเลือกฤดู/โอกาส ที่แพลตฟอร์มกำหนด
export const getProductOptions = async (): Promise<ProductOptions> => {
  const response = await api.get("/brands/product-options");

  return response.data.options;
};

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

  return api.post(
    `/brands/${slug}/products`,
    formData
  );
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

  return api.put(
    `/brands/${slug}/products/${productId}`,
    formData
  );
};

// ลบสินค้า
export const deleteProduct = async (
  slug: string,
  productId: string
) => {
  return api.delete(
    `/brands/${slug}/products/${productId}`
  );
};