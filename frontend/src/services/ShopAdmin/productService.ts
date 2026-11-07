
import api from "../api";


export interface ProductImage {
  id: string;
  s3_key: string;
  image_url: string;
  sort_order: number;
  quality_status?: "PENDING" | "PASSED" | "FAILED";
  quality_reason?: string | null;
}

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  category: string;
  price: number | string | null;
  description: string | null;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
}

export interface ProductFormData {
  name: string;
  category: string;
  price: string;
  description: string;
  sku: string;
  is_active: boolean;
  images: File[];
  remove_image_ids: string[];
}

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

// เพิ่มสินค้า
export const createProduct = async (
  slug: string,
  data: ProductFormData
) => {
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("category", data.category);
  formData.append("price", data.price);
  formData.append("description", data.description);
  formData.append("sku", data.sku);
  formData.append("is_active", String(data.is_active));

  data.images.forEach((image) => {
    formData.append("images", image);
  });

  return api.post(
    `/brands/${slug}/products`,
    formData
  );
};

// แก้ไขสินค้า
export const updateProduct = async (
  slug: string,
  productId: string,
  data: ProductFormData
) => {
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("category", data.category);
  formData.append("price", data.price);
  formData.append("description", data.description);
  formData.append("sku", data.sku);
  formData.append("is_active", String(data.is_active));

  formData.append(
    "remove_image_ids",
    JSON.stringify(data.remove_image_ids)
  );

  data.images.forEach((image) => {
    formData.append("images", image);
  });

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
