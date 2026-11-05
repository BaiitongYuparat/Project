import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";

const menuItems = [
  {
    name: "Dashboard",
    path: "",
    icon: "▦",
  },
  {
    name: "Products",
    path: "/products",
    icon: "♧",
  },
  {
    name: "Try-On Analytics",
    path: "/analytics",
    icon: "◷",
  },
  {
    name: "Reports",
    path: "/reports",
    icon: "⚑",
  },
  {
    name: "Store Settings",
    path: "/settings",
    icon: "⚙",
  },
];

export default function ShopAdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { brandId } = useParams();

  const basePath = `/shopadmin/${brandId}`;

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white px-5 md:hidden">
        <span className="text-xl font-bold text-gray-800">
          LongDress <span className="text-sm font-normal text-gray-400">Shop Admin</span>
        </span>

        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-2xl text-gray-700 hover:bg-gray-100"
          aria-label="Open sidebar"
        >
          ☰
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-64 flex-col
          border-r border-gray-200 bg-white
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <span className="text-xl font-bold text-gray-800">
            LongDress
          </span>

          <button
            onClick={() => setIsOpen(false)}
            className="text-2xl text-gray-500 hover:text-gray-800 md:hidden"
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        {/* Shop Admin Label */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Shop Management
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            Store Dashboard
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={`${basePath}${item.path}`}
              end={item.path === ""}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition
                ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <span className="w-5 text-center text-lg" aria-hidden="true">
                {item.icon}
              </span>

              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <NavLink
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <span className="text-lg">←</span>
            Back to Website
          </NavLink>
        </div>
      </aside>
    </>
  );
}