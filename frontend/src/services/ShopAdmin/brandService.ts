import api from "../api";
import type { RegisterBrandResponse , CheckBrandAccessResponse, BrandMember, BrandMembersResponse } from "../../types/brand";

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

export async function getBrandMembers(
  slug: string
): Promise<BrandMembersResponse> {
  const response = await api.get<BrandMembersResponse>(
    `${baseUrl}/${encodeURIComponent(slug)}/members`
  );

  return response.data;
}

export async function addBrandMember(
  slug: string,
  email: string
): Promise<{ message: string; member: BrandMember }> {
  const response = await api.post(
    `${baseUrl}/${encodeURIComponent(slug)}/members`,
    { email }
  );

  return response.data;
}

export async function removeBrandMember(
  slug: string,
  memberId: string
): Promise<{ message: string }> {
  const response = await api.delete(
    `${baseUrl}/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`
  );

  return response.data;
}