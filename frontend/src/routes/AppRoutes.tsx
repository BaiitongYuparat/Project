import { Routes, Route, Navigate } from "react-router-dom";

import CustomerLayout from "../layouts/CustomerLayout";

import ShopPage from "../pages/User/shop/ShopPage";
import ProfilePage from "../pages/User/Profile";
import BodyPage from "../pages/User/Profile/BodyPage";
import UploadBodyImg from "../pages/User/Profile/UploadBodyImg";
import RegisterPage from "../pages/User/RegisterStore/RegisterPage";
import TryOnPage from "../pages/User/Tryon";
import AIStylistPage from "../pages/User/AIStylist";
import ShopAdminLayout from "../layouts/ShopAdminLayout";
import ShopDashboard from "../pages/AdminStore/Dashboard";
import ProductManagement from "../pages/AdminStore/ProductManagement";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import Dashboard from "../pages/SuperAdmin/Dashboard";
import StoreManagement from "../pages/SuperAdmin/storemanagement/StoreManagement";
import StoreDetail from "../pages/SuperAdmin/storemanagement/StoreDetail";
import UserManagement from "../pages/SuperAdmin/usermanagement/UserManagement";
import ModelManagement from "../pages/SuperAdmin/modelmanagement/ModelManagement"

function AppRoutes() {
  return (
    <Routes>
      {/* Customer Layout */}
      <Route element={<CustomerLayout />}>
        {/* Home */}
        <Route path="/" element={<ShopPage />} />
        {/* Try On */}
        <Route path="/tryon" element={<TryOnPage />} />
        {/* AI */}
        <Route path="/ai" element={<AIStylistPage />} />
        {/* Profile */}
        <Route path="/pages/profile" element={<ProfilePage />}>
          <Route index element={<Navigate to="BodyPage" replace />} />
          <Route path="BodyPage" element={<BodyPage />} />
          <Route path="UploadBodyImg" element={<UploadBodyImg />} />
        </Route>


      </Route>
      <Route path="/brand/register" element={<RegisterPage />} />
      {/* SuperAdmin Layout */}
      <Route path="/superadmin/:brandId" element={<SuperAdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="store-management" element={<StoreManagement />} />
        <Route path="store-management/:id" element={<StoreDetail />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="model-management" element={<ModelManagement />} />
      </Route>

      {/* ShopAdmin Layout */}
      <Route path="/shopadmin/:brandId" element={<ShopAdminLayout />}>
        <Route index element={<ShopDashboard />} />
        <Route path="products" element={<ProductManagement />} />
      </Route>

    </Routes>
  );
}

export default AppRoutes;
