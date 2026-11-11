import api from "./api";
import type { Admin } from "../types/admin";

// ระบบ login ฝั่งผู้ดูแล (/admin-auth) — แยกจาก authService ของ shopper
export type GoogleAdminAuthResponse = {
  admin: Admin;
};

export async function loginAdminWithGoogle(
  idToken: string
): Promise<GoogleAdminAuthResponse> {
  const response = await api.post<GoogleAdminAuthResponse>("/admin-auth/google", {
    idToken,
  });

  return response.data;
}

export async function getCurrentAdmin(): Promise<Admin> {
  const response = await api.get<{ admin: Admin }>("/admin-auth/me");

  return response.data.admin;
}

export async function logoutAdmin(): Promise<void> {
  await api.post("/admin-auth/logout");
}
