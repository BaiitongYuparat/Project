import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "../components/SuperAdminSidebar";

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      {/* Main Content */}
      <main className="min-h-screen pt-16 md:ml-64 md:pt-0">
        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}