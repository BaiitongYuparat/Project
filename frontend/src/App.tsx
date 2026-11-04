import "./App.css";
import NavBar from "./components/Navbar";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "./services/authService";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "./store/store";
import { useEffect } from "react";
import { login, logout, setAuthChecked } from "./store/userSlice";
import LoginModal from "./components/LoginModal";
import BodyModal from "./components/BodyModal";
import { closeLogin, openBody } from "./store/uiSlice";
import { getBody } from "./services/bodyService";
import { setBody } from "./store/bodySlice";
import axios from "axios";
import BodyPage from "./pages/User/Profile/BodyPage";
import UploadBodyImg from "./pages/User/Profile/UploadBodyImg";
import ProfilePage from "./pages/User/Profile";
import ShopPage from "./pages/User/shop/ShopPage";
import RegisterPage from "./pages/User/RegisterStore/RegisterPage";

function MainLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
function App() {
  const dispatch = useDispatch();
  const isLoginOpen = useSelector((state: RootState) => state.ui.isLoginOpen);
  const isBodyOpen = useSelector((state: RootState) => state.ui.isBodyOpen);

  useEffect(() => {
    async function checkLogin() {
      try {
        // 1. ตรวจสอบ Session ของผู้ใช้
        const user = await getCurrentUser();
        dispatch(login(user));

        // 2. โหลด Body ของผู้ใช้
        try {
          const body = await getBody();

          // 3. เก็บ Body ลง Redux
          dispatch(setBody(body));
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            // ไม่มี Body ให้เปิด Modal เพื่อสร้างข้อมูล
            dispatch(openBody());
          } else {
            console.error("Failed to load body:", error);
          }
        }
      } catch (error) {
        // ไม่มี Session หรือ Session ใช้งานไม่ได้
        dispatch(logout());
      } finally {
        dispatch(setAuthChecked());
      }
    }

    checkLogin();
  }, [dispatch]);

  const handleLoginSuccess = async () => {
    dispatch(closeLogin());

    try {
      const body = await getBody();
      dispatch(setBody(body));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        dispatch(openBody());
        return;
      }
      console.error("Failed to fetch body:", error);
    }
  };
  return (
    <BrowserRouter>

      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<ShopPage />} />

          <Route path="/pages/Profile" element={<ProfilePage />}>
            <Route index element={<Navigate to="BodyPage" replace />} />
            <Route path="BodyPage" element={<BodyPage />} />
            <Route path="UploadBodyImg" element={<UploadBodyImg />} />
          </Route>
        </Route>

        <Route path="/brand/register" element={<RegisterPage />} />
      </Routes>

      {isLoginOpen && <LoginModal onLoginSuccess={handleLoginSuccess} />}
      {isBodyOpen && <BodyModal isOpen={isBodyOpen} />}
      <button onClick={() => dispatch(logout())}>logout</button>
    </BrowserRouter>
  );
}

export default App;
