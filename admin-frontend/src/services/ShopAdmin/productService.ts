
import api from "../api";
import type { Product , ProductFormData ,} from "../../types/product";


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
    formData.append("images", image.file);
    formData.append("views", image.view);
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
    formData.append("images", image.file);
    formData.append("views", image.view);
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
