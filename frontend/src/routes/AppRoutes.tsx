import { Routes, Route, Navigate } from "react-router-dom";

import CustomerLayout from "../layouts/CustomerLayout";

import ShopPage from "../pages/User/shop/ShopPage";
import ProfilePage from "../pages/User/Profile";
import BodyPage from "../pages/User/Profile/BodyPage";
import UploadBodyImg from "../pages/User/Profile/UploadBodyImg";
import RegisterPage from "../pages/User/RegisterStore/RegisterPage";
import TryOnPage from "../pages/User/Tryon";
import AIStylistPage from "../pages/User/AIStylist";
import MyOutfitPage from "../pages/User/myoutfit/MyOutfit";

// เว็บไซต์ฝั่งลูกค้าเท่านั้น — หน้าผู้ดูแลทั้งหมดอยู่ที่ admin-frontend/ (port 5174)
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
        <Route path="/my-outfit" element={<MyOutfitPage />} />
      </Route>
      <Route path="/brand/register" element={<RegisterPage />} />
    </Routes>
  );
}

export default AppRoutes;
