import api from "../api";
import type { Brand , BrandDetail , BrandStatus } from "../../types/brand";

const baseUrl = "/admin/brands";

// ดึงรายการร้านค้าทั้งหมด
export async function getBrands(): Promise<Brand[]> {
  const response = await api.get(baseUrl);
  return response.data;
}

// ดึงรายละเอียดร้านค้า
export async function getBrandById(
  id: string
): Promise<BrandDetail> {
  const response = await api.get(`${baseUrl}/${id}`);
  return response.data;
}

// อัปเดตสถานะร้านค้า
export async function updateBrandStatus(
  id: string,
  status: BrandStatus
): Promise<BrandDetail> {
  const response = await api.put(`${baseUrl}/${id}/status`, { status });
  return response.data;
}

// ลบร้านค้า
export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`${baseUrl}/${id}`);
}