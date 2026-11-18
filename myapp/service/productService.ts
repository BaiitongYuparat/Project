import api from "./api";

export type ProductGender = "MALE" | "FEMALE" | "UNISEX";

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  category: string;
  price?: number | string | null;
  description?: string | null;
  gender?: ProductGender | null;
  created_at?: string;
  images: {
    id: string;
    sort_order: number;
    image_url?: string | null;
  }[];
  brand: {
    brand_name: string;
    slug?: string | null;
  };
}

// ค่าต้องตรงกับ enum ImageView ใน Prisma schema
export type ImageView = "FRONT" | "BACK" | "LEFT" | "RIGHT";
// ค่าต้องตรงกับ enum ProductPiece ใน Prisma schema
export type ProductPiece = "SET" | "TOP" | "BOTTOM";

export interface ProductDetailImage {
  id: string;
  color_id?: string | null;
  sort_order: number;
  image_url?: string | null;
  view: ImageView;
  piece?: ProductPiece | null;
}

export interface ProductDetailColor {
  id: string;
  name: string;
  hex?: string | null;
  images: ProductDetailImage[];
}

export interface ProductDetailSizeRow {
  id: string;
  size: string;
  chest?: number | string | null;
  waist?: number | string | null;
  hips?: number | string | null;
  length?: number | string | null;
}

export interface ProductDetailBrand {
  brand_name: string;
  slug?: string | null;
  logo_url?: string | null;
  store_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  line_id?: string | null;
}

export interface ProductDetail {
  id: string;
  brand_id: string;
  name: string;
  category: string;
  price?: number | string | null;
  description?: string | null;
  gender?: ProductGender | null;
  fabric?: string | null;
  seasons?: string[];
  occasions?: string[];
  sku?: string | null;
  images: ProductDetailImage[];
  colors: ProductDetailColor[];
  size_charts: ProductDetailSizeRow[];
  brand: ProductDetailBrand;
}

export const getProducts = async (): Promise<Product[]> => {
  const response = await api.get<{ message: string; products: Product[] }>(
    "/products",
  );

  return response.data.products;
};

export const getProductById = async (
  productId: string,
): Promise<ProductDetail> => {
  const response = await api.get<{ product: ProductDetail }>(
    `/products/${productId}`,
  );

  return response.data.product;
};
