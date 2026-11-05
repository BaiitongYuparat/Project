import { Outlet } from "react-router-dom";
import ShopAdminSidebar from "../components/ShopAdminSidebar";

export default function ShopAdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ShopAdminSidebar />

      {/* Main Content */}
      <main className="min-h-screen pt-16 md:ml-64 md:pt-0">
        <div className="p-5 md:p-8 ">
          <Outlet />
        </div>
      </main>
    </div>
  );
}