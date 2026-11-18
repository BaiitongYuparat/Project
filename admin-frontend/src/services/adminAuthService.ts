import api from "./api";
import { cachedQuery } from "./cache";
import type { Admin } from "../types/admin";

// ระบบ login ฝั่งผู้ดูแล (/admin-auth) — แยกจาก authService ของ shopper
export type GoogleAdminAuthResponse = {
  admin: Admin;
};

const CURRENT_ADMIN_TTL_MS = 5 * 60 * 1000;
const CURRENT_ADMIN_KEY = "current-admin";

export async function loginAdminWithGoogle(
  idToken: string
): Promise<GoogleAdminAuthResponse> {
  const response = await api.post<GoogleAdminAuthResponse>("/admin-auth/google", {
    idToken,
  });

  return response.data;
}

export async function getCurrentAdmin(): Promise<Admin> {
  return cachedQuery(
    CURRENT_ADMIN_KEY,
    async () => {
      const response = await api.get<{ admin: Admin }>("/admin-auth/me");
      return response.data.admin;
    },
    CURRENT_ADMIN_TTL_MS
  );
}

export async function logoutAdmin(): Promise<void> {
  await api.post("/admin-auth/logout");
}
