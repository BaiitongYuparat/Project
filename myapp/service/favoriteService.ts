import api from "./api";
import type { Product } from "./productService";

// รายการโปรดของผู้ใช้ (เก็บฝั่ง backend — ใช้ร่วมกันระหว่างเว็บและแอป)

export const getFavoriteIds = async (): Promise<string[]> => {
  const response = await api.get<{ ids: string[] }>("/favorites/ids");
  return response.data.ids;
};

export const getFavoriteProducts = async (): Promise<Product[]> => {
  const response = await api.get<{ products: Product[] }>("/favorites");
  return response.data.products;
};

export const addFavorite = async (productId: string): Promise<void> => {
  await api.post("/favorites", { product_id: productId });
};

export const removeFavorite = async (productId: string): Promise<void> => {
  await api.delete(`/favorites/${productId}`);
};
