import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useDispatch } from "react-redux";

import AdminLoginPage from "./pages/AdminLogin/AdminLoginPage";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import ShopAdminLayout from "./layouts/ShopAdminLayout";
import ShopAdminGuard from "./components/ShopAdminGuard";
import ShopDashboard from "./pages/AdminStore/Dashboard";
import ProductManagement from "./pages/AdminStore/ProductManagement";
import ProductsLayout from "./pages/AdminStore/ProductsLayout";
import ProductWizard from "./pages/AdminStore/ProductWizard";
import SizeChartManagement from "./pages/AdminStore/SizeChartManagement";
import SizeChartForm from "./pages/AdminStore/SizeChartForm";
import ShopAdminManagement from "./pages/AdminStore/AdminManagement";
import Dashboard from "./pages/SuperAdmin/Dashboard";
import StoreManagement from "./pages/SuperAdmin/storemanagement/StoreManagement";
import StoreDetail from "./pages/SuperAdmin/storemanagement/StoreDetail";
import UserManagement from "./pages/SuperAdmin/usermanagement/UserManagement";
import ModelManagement from "./pages/SuperAdmin/modelmanagement/ModelManagement";
import AI_PromptManagement from "./pages/SuperAdmin/ai_promptmanagement/AI_PromptManagement";
import System from "./pages/SuperAdmin/System";

import { getCurrentAdmin } from "./services/adminAuthService";
import {
  loginAdmin,
  logoutAdmin,
  setAdminAuthChecked,
} from "./store/adminSlice";

// Routes ฝั่งผู้ดูแลทั้งหมด — ไม่มีหน้าของลูกค้าปนอยู่
function App() {
  const dispatch = useDispatch();

  // ตรวจสอบ session ฝั่งผู้ดูแล (cookie admin_token) เมื่อเปิดแอป
  // ให้ authChecked เป็น true ก่อนเสมอ ไม่งั้น ProtectedAdminRoute จะค้างหน้าโหลด
  useEffect(() => {
    async function checkAdminLogin() {
      try {
        const admin = await getCurrentAdmin();

        dispatch(loginAdmin(admin));
      } catch {
        dispatch(logoutAdmin());
      } finally {
        dispatch(setAdminAuthChecked());
      }
    }

    checkAdminLogin();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Login ผู้ดูแล (หน้าแรกของแอปนี้) */}
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

        {/* Super Admin */}
        <Route element={<ProtectedAdminRoute allowedRoles={["SUPER_ADMIN"]} />}>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="store-management" element={<StoreManagement />} />
            <Route path="store-management/:id" element={<StoreDetail />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="model-management" element={<ModelManagement />} />
            <Route path="ai-prompt-management" element={<AI_PromptManagement />} />
            <Route path="system" element={<System />} />
          </Route>
        </Route>

        {/* Shop Admin (เจ้าของ/แอดมินร้าน) */}
        <Route element={<ProtectedAdminRoute requireShopAccess />}>
          <Route path="/shopadmin/:slug" element={<ShopAdminGuard />}>
            <Route path="/shopadmin/:slug" element={<ShopAdminLayout />}>
              <Route index element={<ShopDashboard />} />
              <Route path="products" element={<ProductsLayout />}>
                <Route index element={<ProductManagement />} />
                <Route path="new" element={<ProductWizard />} />
                <Route path=":id/edit" element={<ProductWizard />} />
              </Route>
              <Route path="size-charts" element={<SizeChartManagement />} />
              <Route path="size-charts/new" element={<SizeChartForm />} />
              <Route path="size-charts/:id/edit" element={<SizeChartForm />} />
              <Route path="admin" element={<ShopAdminManagement />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
