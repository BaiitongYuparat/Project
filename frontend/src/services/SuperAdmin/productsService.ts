import api from "../api";

export interface AdminProductStats {
  total: number;
  pass: number;
  fail: number;
  review: number;
}

export interface AdminProductRow {
  id: string;
  name: string;
  sku: string | null;
  is_active: boolean;
  brand: { id: string; name: string };
  thumbnail: string | null;
  quality: "PASS" | "FAIL" | "REVIEW" | "PENDING";
}

export async function getProductStats(): Promise<AdminProductStats> {
  const response = await api.get("/admin/products/stats");
  return response.data.stats;
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const response = await api.get("/admin/products");
  return response.data.products;
}

