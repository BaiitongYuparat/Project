import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from "../store/store";
import { logout } from "../store/userSlice";
import { openLogin, openSuspended } from "../store/uiSlice";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// session หมดอายุ/ไม่ถูกต้องกลางทาง → เคลียร์ token แล้วเด้ง login modal
// ข้าม endpoint ของ auth เอง — 401 จาก /auth/me, /auth/google เป็น flow ปกติที่หน้าจอจัดการอยู่แล้ว
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number | undefined = error?.response?.status;
    const url: string = error?.config?.url ?? "";

    // บัญชีถูกแอดมินระงับระหว่างใช้งาน (authMiddleware ตอบ 403 "Account is not active")
    // → เคลียร์ session แล้วเด้ง popup แจ้งบัญชีถูกระงับ (เหมือนเว็บ)
    if (
      status === 403 &&
      error?.response?.data?.message === "Account is not active" &&
      !url.startsWith("/auth/") &&
      !!error?.config?.headers?.Authorization
    ) {
      await AsyncStorage.removeItem("token").catch(() => undefined);
      store.dispatch(logout());
      if (!store.getState().ui.isSuspendedOpen) store.dispatch(openSuspended());
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      !url.startsWith("/auth/") &&
      store.getState().user.user !== null
    ) {
      await AsyncStorage.removeItem("token").catch(() => undefined);
      store.dispatch(logout());
      store.dispatch(openLogin());
    }

    return Promise.reject(error);
  },
);

export default api;
