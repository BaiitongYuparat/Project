import { useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
  chevronDownOutline,
  chevronForwardOutline,
  closeOutline,
  gridOutline,
  menuOutline,
  pricetagsOutline,
  resizeOutline,
  logOutOutline,
  storefrontOutline,
  personOutline,
} from "ionicons/icons";
import { logoutAdmin as logoutAdminApi } from "../services/adminAuthService";
import { logoutAdmin as clearAdminAuth } from "../store/adminSlice";
import ConfirmLogoutModal from "./ConfirmLogoutModal";

// รายการเมนู — มี children = กลุ่มแบบ dropdown (กดหัวข้อแล้วกาง/หุบ)
const menuItems = [
  {
    name: "Dashboard",
    path: "",
    icon: gridOutline,
  },
  {
    name: "Product",
    icon: pricetagsOutline,
    children: [
      {
        name: "Product Management",
        path: "/products",
        icon: pricetagsOutline,
      },
      {
        name: "Size Charts",
        path: "/size-charts",
        icon: resizeOutline,
      },
    ],
  },
  {
    name: "Admin Management",
    path: "/admin",
    icon: personOutline,
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { slug } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const basePath = `/shopadmin/${slug}`;

  // อยู่ในส่วน Product/Size Charts ไหม — ใช้กางกลุ่ม Product อัตโนมัติ
  const inProductSection =
    location.pathname.startsWith(`${basePath}/products`) ||
    location.pathname.startsWith(`${basePath}/size-charts`);

  const [productOpen, setProductOpen] = useState(inProductSection);
  const [wasInProductSection, setWasInProductSection] =
    useState(inProductSection);

  // เด้งเข้าหน้า product/size chart ตรง ๆ → กางกลุ่มให้เสมอ
  // (ปรับ state ระหว่าง render — แทน useEffect กัน cascading render)
  if (inProductSection !== wasInProductSection) {
    setWasInProductSection(inProductSection);

    if (inProductSection) {
      setProductOpen(true);
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logoutAdminApi();
    } catch (error) {
      // ถ้า API ล้มเหลวก็ยังเคลียร์ state และเด้งกลับหน้า login
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
      dispatch(clearAdminAuth());
      navigate("/login", { replace: true });
    }
  };

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
          {menuItems.map((item) =>
            item.children ? (
              <div key={item.name}>
                {/* Group header — กดเพื่อกาง/หุบ dropdown */}
                <button
                  type="button"
                  onClick={() => setProductOpen((previous) => !previous)}
                  aria-expanded={productOpen}
                  className={`${itemBase} w-full ${
                    inProductSection
                      ? "bg-[#87947A]/15 font-semibold text-[#5F6E53]"
                      : "text-[#766454] hover:bg-[#E9E0D2]"
                  }`}
                >
                  <IonIcon
                    icon={item.icon}
                    className={`text-xl transition-colors ${
                      inProductSection
                        ? "text-[#6B7A5E]"
                        : "text-[#A99A87] group-hover:text-[#766454]"
                    }`}
                  />
                  {item.name}
                  <IonIcon
                    icon={productOpen ? chevronDownOutline : chevronForwardOutline}
                    className={`ml-auto text-sm transition-colors ${
                      inProductSection ? "text-[#6B7A5E]" : "text-[#A99A87]"
                    }`}
                  />
                </button>

                {/* Group children */}
                {productOpen && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.name}
                        to={`${basePath}${child.path}`}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                          `${itemBase} pl-11 ${
                            isActive
                              ? "bg-[#87947A] font-semibold text-white shadow-sm"
                              : "text-[#766454] hover:bg-[#E9E0D2]"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <IonIcon
                              icon={child.icon}
                              className={`text-lg transition-colors ${
                                isActive
                                  ? "text-white"
                                  : "text-[#A99A87] group-hover:text-[#766454]"
                              }`}
                            />
                            {child.name}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
            ),
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#D9CDB9] p-3">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setConfirmLogout(true);
            }}
            className={`${itemBase} w-full text-[#766454] hover:bg-[#E9E0D2]`}
          >
            <IonIcon
              icon={logOutOutline}
              className="text-xl text-[#A99A87] transition-colors group-hover:text-[#766454]"
            />
            Logout
          </button>
        </div>
      </aside>

      {/* Confirm logout modal */}
      <ConfirmLogoutModal
        open={confirmLogout}
        loading={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
