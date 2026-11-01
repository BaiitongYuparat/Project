import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../service/userservice";

//กำหนด type
type UserState = {
  user: User | null;
  authChecked: boolean;
};
// ตั้งค่าข้อมูลจริง (เริ่มต้นไม่มีผู้ใช้งาน)
const initialState: UserState = {
  user: null,
  authChecked: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
    setAuthChecked: (state) => {
      state.authChecked = true;
    },
  },
});

export const { login, logout , setAuthChecked } = userSlice.actions;
export default userSlice.reducer;