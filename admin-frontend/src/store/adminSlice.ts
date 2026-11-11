import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Admin } from "../types/admin";

// ตั้งค่าข้อมูลบัญชีผู้ดูแล (เริ่มต้นไม่มีผู้ใช้งาน) — แยกจาก userSlice ของ shopper
type AdminState = {
  admin: Admin | null;
  authChecked: boolean;
};

const initialState: AdminState = {
  admin: null,
  authChecked: false,
};

export const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    loginAdmin: (state, action: PayloadAction<Admin>) => {
      state.admin = action.payload;
    },
    logoutAdmin: (state) => {
      state.admin = null;
    },
    setAdminAuthChecked: (state) => {
      state.authChecked = true;
    },
  },
});

export const { loginAdmin, logoutAdmin, setAdminAuthChecked } = adminSlice.actions;
export default adminSlice.reducer;
