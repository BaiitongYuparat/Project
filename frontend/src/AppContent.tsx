import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

import type { RootState } from "./store/store";
import type { User } from "./types/user";

import { getCurrentUser } from "./services/authService";
import { getBody } from "./services/bodyService";
import { getBodyType } from "./services/bodyTypeService";
import { setBodyType } from "./store/bodyTypeSlice";

import { login, logout, setAuthChecked } from "./store/userSlice";

import { closeLogin, openBody } from "./store/uiSlice";

import { setBody } from "./store/bodySlice";
import LoginModal from "./components/LoginModal";
import BodyModal from "./components/BodyModal";

import AppRoutes from "./routes/AppRoutes";

export default function AppContent() {
  const dispatch = useDispatch();

  const isLoginOpen = useSelector((state: RootState) => state.ui.isLoginOpen);

  const isBodyOpen = useSelector((state: RootState) => state.ui.isBodyOpen);

  // ตรวจสอบ Session shopper เมื่อเปิดเว็บไซต์
  useEffect(() => {
    async function checkLogin() {
      try {
        const user = await getCurrentUser();

        dispatch(login(user));

        await loadUserBody();
      } catch (error) {
        dispatch(logout());
      } finally {
        dispatch(setAuthChecked());
      }
    }

    checkLogin();
  }, [dispatch]);

  // Login สำเร็จ (shopper) — ไปหน้าเว็บไซต์ปกติทันที
  const handleLoginSuccess = async (user: User) => {
    dispatch(closeLogin());
    dispatch(login(user));

    await loadUserBody();
  };

  // โหลด Body
  const loadUserBody = async () => {
    try {
      const body = await getBody();
      dispatch(setBody(body));
      try {
        const bodyType = await getBodyType();
        dispatch(setBodyType(bodyType));
      } catch (error) {
        // ยังไม่มี body type ก็ไม่เป็นไร
        console.log("No body type yet");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        dispatch(openBody());
      } else {
        console.error("Failed to load body:", error);
      }
    }
  };

  return (
    <>
      <AppRoutes />

      {isLoginOpen && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {isBodyOpen && <BodyModal isOpen={isBodyOpen} />}
    </>
  );
}
