import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

type MenuItem = {
  label: string;
  to: string;
};

const superAdminMenu: MenuItem[] = [
  { label: "Dashboard & Analytics", to: "/dashboard" },
  { label: "Store Management", to: "/store-management" },
  { label: "User Management", to: "/user-management" },
  { label: "Admin Management", to: "/admin-management" },
  { label: "AI Prompt Management", to: "/ai-prompt-management" },
  { label: "Product Management", to: "/product-management" },
  { label: "System", to: "/system" },
];

const adminMenu: MenuItem[] = [
  { label: "Dashboard & Analytics", to: "/dashboard" },
  { label: "Product Management", to: "/product-management" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);

  const isSuperAdmin = user?.role === "superadmin";
  const menu = isSuperAdmin ? superAdminMenu : adminMenu;
  const roleLabel = isSuperAdmin ? "Super Admin" : "Admin";
  const roleSubLabel = isSuperAdmin ? "Platform" : "Store";

  // ปรับชื่อ field ให้ตรงกับ user slice ของคุณ
  const displayName =
    (user as { name?: string; username?: string } | null)?.name ??
    (user as { name?: string; username?: string } | null)?.username ??
    "";

  const handleLogout = () => {
    // TODO: เปลี่ยนเป็น dispatch(logout()) ตาม store ของคุณ
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <aside className="flex min-h-screen w-72 flex-col bg-white p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#2B2620]">
          Virtual Try-On Admin
        </h1>
        <span className="mt-4 inline-block rounded-full bg-[#F1E9D8] px-4 py-1.5 text-sm font-medium text-[#2F55D4]">
          {roleLabel}
        </span>
      </div>

      {/* Menu */}
      <nav className="mt-8 flex-1">
        <ul className="space-y-2">
          {menu.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] transition-colors duration-200
                  ${
                    isActive
                      ? "bg-[#F1E9D8] font-bold text-[#2B2620]"
                      : "text-[#2B2620] hover:bg-[#F7F2E7]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        isActive ? "bg-[#2F55D4]" : "bg-[#D3C9B0]"
                      }`}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#F1E6D8] pt-5">
        <p className="font-semibold text-[#2B2620]">{displayName}</p>
        <p className="mt-2 text-sm text-[#6B6558]">
          {roleLabel} · {roleSubLabel}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 text-sm text-[#2F55D4] hover:underline"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}