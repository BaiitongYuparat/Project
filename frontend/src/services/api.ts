import axios from "axios";

import { store } from "../store/store";
import { logout } from "../store/userSlice";
import { openLogin } from "../store/uiSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Session หมดอายุ/ไม่ถูกต้องกลางทาง → เอา user ออกแล้วเด้ง LoginModal ให้ login ใหม่
// ข้าม endpoint ของ auth เอง — 401 จาก /auth/me, /auth/google เป็น flow ปกติที่ handler จัดการอยู่แล้ว
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;
    const url: string = error?.config?.url ?? "";

    if (
      status === 401 &&
      !url.startsWith("/auth/") &&
      store.getState().user.user !== null
    ) {
      store.dispatch(logout());
      store.dispatch(openLogin());
    }

    return Promise.reject(error);
  },
);

export default api;
