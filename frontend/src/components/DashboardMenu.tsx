import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { IonIcon } from "@ionic/react";

import {
  chevronDownOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
} from "ionicons/icons";

import type { RootState } from "../store/store";
interface DashboardMenuProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function DashboardMenu({
  mobile = false,
  onNavigate,
}: DashboardMenuProps) {
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.user.user);

  const authChecked = useSelector((state: RootState) => state.user.authChecked);

  const [isOpen, setIsOpen] = useState(false);

  // รอตรวจสอบ Login
  if (!authChecked || !user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  // Super Admin เข้าได้เฉพาะ Admin Dashboard
  const brandMemberships = isSuperAdmin
    ? []
    : (user.brandMemberships?.filter(
        (brand) => brand.role === "OWNER" || brand.role === "ADMIN",
      ) ?? []);

  const canAccessDashboard = isSuperAdmin || brandMemberships.length > 0;

  if (!canAccessDashboard) return null;

  const closeMenu = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  const handleAdminDashboard = () => {
    closeMenu();
    navigate("/admin");
  };

  const handleShopDashboard = (brandId: string) => {
    closeMenu();
    navigate(`/shopadmin/${brandId}`);
  };

  return (
    <div className={`relative ${mobile ? "w-full" : "w-auto"}`}>
      {/* Dashboard Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`
          flex items-center justify-between gap-2
          rounded-full border border-secondary/30
          px-4 py-2 font-medium text-secondary
          transition-all duration-300
          hover:border-secondary hover:bg-secondary
          hover:text-white hover:shadow-[0_0_15px_rgba(120,90,180,0.25)]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-secondary/40
          ${mobile ? "w-full rounded-xl" : "whitespace-nowrap"}
        `}
      >
        <span>Dashboard</span>

        <IonIcon
          icon={chevronDownOutline}
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            z-50 rounded-xl border border-gray-100
            bg-white p-2 shadow-xl
            ${mobile ? "relative mt-2 w-full" : "absolute right-0 mt-2 w-64"}
          `}
        >
          {/* Super Admin */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleAdminDashboard}
              className="
                flex w-full items-center gap-3
                rounded-lg px-3 py-3 text-left
                transition-colors hover:bg-secondary/10
              "
            >
              <span
                className="
                flex h-10 w-10 shrink-0 items-center
                justify-center rounded-lg
                bg-secondary/10 text-secondary
              "
              >
                <IonIcon icon={shieldCheckmarkOutline} className="text-xl" />
              </span>

              <span>
                <span className="block font-semibold text-secondary">
                  Admin Dashboard
                </span>

                <span className="text-xs text-gray-500">จัดการระบบทั้งหมด</span>
              </span>
            </button>
          )}

          {/* Owner / Admin ของร้าน */}
          {brandMemberships.map((brand) => (
            <button
              key={brand.brandId}
              type="button"
              onClick={() => handleShopDashboard(brand.brandId)}
              className="
                flex w-full items-center gap-3
                rounded-lg px-3 py-3 text-left
                transition-colors hover:bg-secondary/10
              "
            >
              <span
                className="
                flex h-10 w-10 shrink-0 items-center
                justify-center rounded-lg
                bg-secondary/10 text-secondary
              "
              >
                <IonIcon icon={storefrontOutline} className="text-xl" />
              </span>

              <span className="min-w-0">
                <span className="block truncate font-semibold text-secondary">
                  {brand.brandName}
                </span>

                <span className="text-xs text-gray-500">
                  Shop Dashboard · {brand.role}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
