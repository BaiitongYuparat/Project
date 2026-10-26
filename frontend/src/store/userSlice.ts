import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../services/userSlice";

//กำหนด type
type UserState = {
  user: User | null;
};
// ตั้งค่าข้อมูลจริง (เริ่มต้นไม่มีผู้ใช้งาน)
const initialState: UserState = {
  user: null,
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
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;