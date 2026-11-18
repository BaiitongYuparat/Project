import api from "../api";
import { cachedQuery, invalidate } from "../cache";
import type { RegisterBrandResponse , CheckBrandAccessResponse, BrandMember, BrandMembersResponse, BrandSettings, UpdateBrandSettingsResponse, OwnerTransferStatusResponse, RequestOwnerTransferResponse } from "../../types/brand";

const baseUrl = "/brands";
const BRAND_SETTINGS_TTL_MS = 5 * 60 * 1000;
const BRAND_MEMBERS_TTL_MS = 30 * 1000;
const OWNER_TRANSFER_TTL_MS = 30 * 1000;

const brandSettingsKey = (slug: string) => `brand-settings:${slug}`;
const brandMembersKey = (slug: string) => `brand-members:${slug}`;
const ownerTransferKey = (slug: string) => `brand-owner-transfer:${slug}`;

export const invalidateBrandMembers = (slug: string) =>
  invalidate(brandMembersKey(slug), { keepStale: true });

export const invalidateOwnerTransferStatus = (slug: string) =>
  invalidate(ownerTransferKey(slug), { keepStale: true });

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
  slug: string,
  opts: { force?: boolean } = {},
): Promise<BrandMembersResponse> {
  return cachedQuery(
    brandMembersKey(slug),
    async () => {
      const response = await api.get<BrandMembersResponse>(
        `${baseUrl}/${encodeURIComponent(slug)}/members`
      );

      return response.data;
    },
    BRAND_MEMBERS_TTL_MS,
    opts,
  );
}

export async function addBrandMember(
  slug: string,
  email: string
): Promise<{ message: string; member: BrandMember }> {
  const response = await api.post(
    `${baseUrl}/${encodeURIComponent(slug)}/members`,
    { email }
  );

  invalidateBrandMembers(slug);

  return response.data;
}

export async function removeBrandMember(
  slug: string,
  memberId: string
): Promise<{ message: string }> {
  const response = await api.delete(
    `${baseUrl}/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`
  );

  invalidateBrandMembers(slug);

  return response.data;
}

// ดึงคำขอเปลี่ยน OWNER ล่าสุดของร้าน (ไว้โชว์สถานะ "รอ Super Admin อนุมัติ")
export async function getOwnerTransferStatus(
  slug: string,
  opts: { force?: boolean } = {},
): Promise<OwnerTransferStatusResponse> {
  return cachedQuery(
    ownerTransferKey(slug),
    async () => {
      const response = await api.get<OwnerTransferStatusResponse>(
        `${baseUrl}/${encodeURIComponent(slug)}/members/owner-transfer`
      );

      return response.data;
    },
    OWNER_TRANSFER_TTL_MS,
    opts,
  );
}

// ยื่นคำขอเปลี่ยน OWNER (เฉพาะ OWNER ปัจจุบัน) — ระบุอีเมลใหม่ที่จะเป็น OWNER
export async function requestOwnerTransfer(
  slug: string,
  email: string
): Promise<RequestOwnerTransferResponse> {
  const response = await api.post(
    `${baseUrl}/${encodeURIComponent(slug)}/members/owner-transfer`,
    { email }
  );

  invalidateOwnerTransferStatus(slug);
  invalidateBrandMembers(slug);

  return response.data;
}

// ข้อมูลร้านสำหรับหน้า Store Settings (และใช้แสดงชื่อ/โลโก้ร้านใน sidebar)
export async function getBrandSettings(
  slug: string
): Promise<BrandSettings> {
  return cachedQuery(
    brandSettingsKey(slug),
    async () => {
      const response = await api.get<BrandSettings>(
        `${baseUrl}/${encodeURIComponent(slug)}`
      );

      return response.data;
    },
    BRAND_SETTINGS_TTL_MS,
  );
}

// บันทึกข้อมูลร้าน (ส่ง logo ผ่าน FormData เมื่อมีการเปลี่ยนรูป)
export async function updateBrandSettings(
  slug: string,
  formData: FormData
): Promise<UpdateBrandSettingsResponse> {
  const response = await api.patch<UpdateBrandSettingsResponse>(
    `${baseUrl}/${encodeURIComponent(slug)}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
}