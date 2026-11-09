import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

import type { RootState } from "./store/store";
import type { User, BrandMembership } from "./types/user";

import { getCurrentUser } from "./services/authService";
import { getBody } from "./services/bodyService";
import { getBodyType } from "./services/bodyTypeService";
import { setBodyType } from "./store/bodyTypeSlice";

import { login, logout, setAuthChecked } from "./store/userSlice";

import {
  closeEntryChoice,
  closeLogin,
  openBody,
  openEntryChoice,
} from "./store/uiSlice";

import { setBody } from "./store/bodySlice";
import LoginModal from "./components/LoginModal";
import BodyModal from "./components/BodyModal";
import EntryChoiceModal from "./components/EntryChoiceModal";

import AppRoutes from "./routes/AppRoutes";

export default function AppContent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLoginOpen = useSelector((state: RootState) => state.ui.isLoginOpen);

  const isBodyOpen = useSelector((state: RootState) => state.ui.isBodyOpen);

  const isEntryChoiceOpen = useSelector(
    (state: RootState) => state.ui.isEntryChoiceOpen,
  );

  const entryChoiceBrand = useSelector(
    (state: RootState) => state.ui.entryChoiceBrand,
  );

  // ตรวจสอบ Session เมื่อเปิดเว็บไซต์
  useEffect(() => {
    async function checkLogin() {
      try {
        const user = await getCurrentUser();

        dispatch(login(user));

        if (user.role === "SUPER_ADMIN") {
          dispatch(openEntryChoice(null));
          return;
        }
        const ownerBrand = user.brandMemberships?.find(
          (brand) => brand.role === "OWNER" || brand.role === "ADMIN",
        );

        if (ownerBrand) {
          dispatch(openEntryChoice(ownerBrand));
          return;
        }

        await loadUserBody();
      } catch (error) {
        dispatch(logout());
      } finally {
        dispatch(setAuthChecked());
      }
    }

    checkLogin();
  }, [dispatch]);

  // Login สำเร็จ
  const handleLoginSuccess = async (user: User) => {
    dispatch(closeLogin());
    dispatch(login(user));
    //  ตรวจ role

    // Super Admin
    if (user.role === "SUPER_ADMIN") {
      dispatch(openEntryChoice(null));
      return;
    }

    // !=SuperAdmin แต่เป็น Admin/Owner ของร้านค้า
    const ownerBrand = user.brandMemberships?.find(
      (brand) => brand.role === "OWNER" || brand.role === "ADMIN",
    );

    // Owner เลือกหน้าเข้าใช้งาน
    if (ownerBrand) {
      dispatch(openEntryChoice(ownerBrand));
      return;
    }

    // User ทั่วไป
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

  // เลือก Website
  const handleSelectWebsite = async () => {
    dispatch(closeEntryChoice());

    await loadUserBody();
    navigate("/");
  };

  // เลือก Shop Dashboard
  const handleSelectShopDashboard = (brand: BrandMembership) => {
    dispatch(closeEntryChoice());

    navigate(`/shopadmin/${brand.slug}`);
  };

  //Super Admin
  const handleSelectSuperAdminDashboard = () => {
    dispatch(closeEntryChoice());
    navigate("/superadmin");
  };

  return (
    <>
      <AppRoutes />

      {isLoginOpen && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {isBodyOpen && <BodyModal isOpen={isBodyOpen} />}

      {isEntryChoiceOpen && (
        <EntryChoiceModal
          brand={entryChoiceBrand}
          onSelectWebsite={handleSelectWebsite}
          onSelectShopDashboard={handleSelectShopDashboard}
          onSelectSuperAdminDashboard={handleSelectSuperAdminDashboard}
        />
      )}
    </>
  );
}
