import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppealSummary } from "../service/appealService";

type UiState = {
  isLoginOpen: boolean;
  // popup บัญชีถูกระงับ
  isSuspendedOpen: boolean;
  // มี token = โดนระงับตอน login → ยื่นคำร้องได้ / null = โดนระงับระหว่างใช้งาน → แจ้งเตือนอย่างเดียว
  appealToken: string | null;
  // คำร้องล่าสุด (จาก response ตอน login) — null ถ้ายังไม่เคยยื่น
  latestAppeal: AppealSummary | null;
};

const initialState: UiState = {
  isLoginOpen: false,
  isSuspendedOpen: false,
  appealToken: null,
  latestAppeal: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openLogin: (state) => {
      state.isLoginOpen = true;
    },
    closeLogin: (state) => {
      state.isLoginOpen = false;
    },
    openSuspended: (
      state,
      action: PayloadAction<{ appealToken?: string | null; appeal?: AppealSummary | null } | undefined>,
    ) => {
      state.isSuspendedOpen = true;
      state.appealToken = action.payload?.appealToken ?? null;
      state.latestAppeal = action.payload?.appeal ?? null;
    },
    closeSuspended: (state) => {
      state.isSuspendedOpen = false;
      state.appealToken = null;
    },
    setSuspendedAppeal: (state, action: PayloadAction<AppealSummary | null>) => {
      state.latestAppeal = action.payload;
    },
  },
});

export const { openLogin, closeLogin, openSuspended, closeSuspended, setSuspendedAppeal } =
  uiSlice.actions;
export default uiSlice.reducer;
