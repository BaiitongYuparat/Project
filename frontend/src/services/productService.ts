import api from "./api";

export interface Product {
  id: string;
  brand_id: string;
  shop_name: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  category: string;
  images: {
    id: string;
    s3_key: string;
    sort_order: number;
    image_url?: string;
  }[];
  gender?: "MALE" | "FEMALE" | null;
  color?: string;
  fit?: string;
}

export const getProducts = async (): Promise<Product[]> => {

  const response = await api.get<{message:string , products: Product[]}>("/products");

  return response.data.products;
};