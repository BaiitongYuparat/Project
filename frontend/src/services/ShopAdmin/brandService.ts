import api from "../api";
import type { RegisterBrandResponse , CheckBrandAccessResponse } from "../../types/brand";

const baseUrl = "/brands";

// สมัครร้านค้า
export async function registerBrand(
  formData: FormData
): Promise<RegisterBrandResponse> {
  const response = await api.post(`${baseUrl}/register`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

// ตรวจสอบสิทธิ์เข้าถึงร้านค้า
export async function checkBrandAccess(
  slug: string
): Promise<CheckBrandAccessResponse> {
  const response = await api.get<CheckBrandAccessResponse>(
    `${baseUrl}/${encodeURIComponent(slug)}/access`
  );

  return response.data;
}