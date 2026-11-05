import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  arrowBackOutline,
  closeOutline,
  gridOutline,
  menuOutline,
  pricetagsOutline,
  analyticsOutline,
  flagOutline,
  settingsOutline,
  storefrontOutline,
} from "ionicons/icons";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

const menuItems = [
  {
    name: "Dashboard",
    path: "",
    icon: gridOutline,
  },
  {
    name: "Products",
    path: "/products",
    icon: pricetagsOutline,
  },
  {
    name: "Try-On Analytics",
    path: "/analytics",
    icon: analyticsOutline,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: flagOutline,
  },
  {
    name: "Store Settings",
    path: "/settings",
    icon: settingsOutline,
  },
];

const itemBase =
  "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xl text-secondary">
        <IonIcon icon={storefrontOutline} />
      </span>
      <span className="text-lg font-bold leading-none text-[#766454]">
        LongDress
        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-[#A99A87]">
          Shop Admin
        </span>
      </span>
    </span>
  );
}

export default function ShopAdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { slug } = useParams();
  const user = useSelector((state: RootState) => state.user.user);

  const basePath = `/shopadmin/${slug}`;

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#D9CDB9] bg-[#E9E0D2] px-5 md:hidden">
        <Logo />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#766454] transition-colors hover:bg-[#F7F3EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open sidebar"
          aria-expanded={isOpen}
        >
          <IonIcon icon={menuOutline} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-[#D9CDB9] bg-[#F7F3EB] shadow-xl transition-transform duration-300 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#D9CDB9] bg-[#E9E0D2] px-5">
          <Logo />

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-[#766454] transition-colors hover:bg-[#F7F3EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            aria-label="Close sidebar"
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        {/* Shop Admin Label */}
        <div className="px-6 pb-2 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A99A87]">
            Shop Management
          </p>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Shop admin"
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-3"
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={`${basePath}${item.path}`}
              end={item.path === ""}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `${itemBase} ${
                  isActive
                    ? "bg-[#87947A] font-semibold text-white shadow-sm"
                    : "text-[#766454] hover:bg-[#E9E0D2]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <IonIcon
                    icon={item.icon}
                    className={`text-xl transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-[#A99A87] group-hover:text-[#766454]"
                    }`}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#D9CDB9] p-3">
          <NavLink
            to="/"
            onClick={() => setIsOpen(false)}
            className={`${itemBase} text-[#766454] hover:bg-[#E9E0D2]`}
          >
            <IonIcon
              icon={arrowBackOutline}
              className="text-xl text-[#A99A87] transition-all group-hover:-translate-x-0.5 group-hover:text-[#766454]"
            />
            Back to Website
          </NavLink>
        </div>
      </aside>
    </>
  );
}
