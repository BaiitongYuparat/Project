import { createSlice } from "@reduxjs/toolkit";
import type { AppealSummary } from "../types/appeal";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isLoginOpen: false,
    isBodyOpen: false,
    isSuspendedOpen: false,
    // คำร้องล่าสุดของบัญชีที่ถูกระงับ (จาก response ตอน login) — ใช้แสดงแจ้งเตือนบน SuspendedAppealModal
    latestAppeal: null as AppealSummary | null,
  },
  reducers: {
    openLogin: (state) => {
      state.isLoginOpen = true;
    },
    closeLogin: (state) => {
      state.isLoginOpen = false;
    },
    openBody: (state) => {
      state.isBodyOpen = true;
    },
    closeBody: (state) => {
      state.isBodyOpen = false;
    },
    openSuspended: (state) => {
      state.isSuspendedOpen = true;
    },
    closeSuspended: (state) => {
      state.isSuspendedOpen = false;
    },
    setSuspendedAppeal: (state, action) => {
      state.latestAppeal = action.payload;
    },
    clearSuspendedAppeal: (state) => {
      state.latestAppeal = null;
    },
  },
});

export const {
  openLogin,
  closeLogin,
  openBody,
  closeBody,
  openSuspended,
  closeSuspended,
  setSuspendedAppeal,
  clearSuspendedAppeal,
} = uiSlice.actions;

export default uiSlice.reducer;
