export type ImageView = "FRONT" | "BACK" | "LEFT" | "RIGHT";


export interface ProductImage {
  id: string;
  s3_key: string;
  image_url: string;
  sort_order: number;
  quality_status: "PENDING" | "PASSED" | "FAILED";
  quality_reason?: string | null;
  view: ImageView;
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
  images: {
  file: File;
  view: ImageView;
}[];
  remove_image_ids: string[];
}