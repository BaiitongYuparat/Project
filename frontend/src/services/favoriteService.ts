import api from "./api";
import type { Product } from "./productService";

// รายการโปรดของผู้ใช้ (เก็บฝั่ง backend — ใช้ร่วมกันระหว่างเว็บและแอป)

export async function getFavoriteIds(): Promise<string[]> {
  const response = await api.get<{ ids: string[] }>("/favorites/ids");
  return response.data.ids;
}

export async function getFavoriteProducts(): Promise<Product[]> {
  const response = await api.get<{ products: Product[] }>("/favorites");
  return response.data.products;
}

export async function addFavorite(productId: string): Promise<void> {
  await api.post("/favorites", { product_id: productId });
}

export async function removeFavorite(productId: string): Promise<void> {
  await api.delete(`/favorites/${productId}`);
}
