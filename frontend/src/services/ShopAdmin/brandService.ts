import api from "../api";
import type { RegisterBrandResponse } from "../../types/brand";

const baseUrl = "/brands";

// สมัครร้านค้า (เรียกจากหน้า RegisterPage ฝั่ง shopper — ระบบจะสร้างบัญชี Admin ให้เมื่อร้านได้รับอนุมัติ)
export async function registerBrand(
  formData: FormData
): Promise<RegisterBrandResponse> {
  const response = await api.post(`${baseUrl}/register`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}
