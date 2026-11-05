import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
  chevronDownOutline,
  closeOutline,
  logOutOutline,
  menuOutline,
  personOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
} from "ionicons/icons";

import Button from "./Button";
import type { RootState } from "../store/store";
import { openLogin } from "../store/uiSlice";
import { logout as logoutAction } from "../store/userSlice";
import { logout as logoutAPI } from "../services/authService";

// ---------- Styles (ใช้ซ้ำทั้ง desktop และ mobile) ----------
const sectionLabel =
  "px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-secondary/50";

const dropdownItem =
  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-secondary transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:bg-secondary/10";

const mobileItem =
  "flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left text-secondary transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:bg-secondary/10";

const logoutItem = "text-red-600 hover:bg-red-50 focus-visible:bg-red-50";

function Avatar({ text }: { text: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
      {text.charAt(0).toUpperCase()}
    </span>
  );
}

export default function NavBar() {
  const user = useSelector((state: RootState) => state.user.user);
  const authChecked = useSelector(
    (state: RootState) => state.user.authChecked
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { name: "Home", path: "/", requireAuth: false },
    { name: "Try-On", path: "/tryon", requireAuth: false },
    { name: "AI Stylist", path: "/ai", requireAuth: false },
    { name: "My Outfit", path: "/my-outfit", requireAuth: true },
  ];

  const filteredNavLinks = navLinks.filter(
    (link) => !link.requireAuth || user !== null
  );

  // ตรวจสอบสิทธิ์ Dashboard
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const brandMemberships = !isSuperAdmin
    ? user?.brandMemberships?.filter(
        (brand) => brand.role === "OWNER" || brand.role === "ADMIN"
      ) ?? []
    : [];

  const hasDashboardAccess = isSuperAdmin || brandMemberships.length > 0;

  const displayName = user?.name ?? user?.email ?? "User";

  // Style ของ NavLink
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-3xl px-4 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "bg-secondary text-white"
        : "text-secondary hover:bg-secondary/10"
    }`;

  // ปิด Dropdown
  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  // ปิด dropdown โปรไฟล์เมื่อคลิกข้างนอกหรือกด Esc
  useEffect(() => {
    if (!isProfileOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isProfileOpen]);

  // Logout
  const handleLogout = async () => {
    try {
      await logoutAPI();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      dispatch(logoutAction());
      closeMenus();
      navigate("/");
    }
  };

  // ไปหน้า Profile
  const handleProfile = () => {
    closeMenus();
    navigate("/pages/profile");
  };

  // ไปหน้า Dashboard
  const handleAdminDashboard = () => {
    closeMenus();
    navigate("/superadmin");
  };

  const handleShopDashboard = (slug: string) => {
    closeMenus();
    navigate(`/shopadmin/${slug}`);
  };

  return (
    <header className="relative z-50 h-16 bg-white px-4 shadow-md shadow-black/20 sm:px-6">
      <div className="flex h-full items-center justify-between gap-3">
        {/* Logo */}
        <div className="shrink-0">
          <NavLink to="/" className="text-xl font-bold text-secondary">
            LongDress
          </NavLink>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex lg:gap-2"
        >
          {authChecked &&
            filteredNavLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === "/"}
                className={linkClass}
              >
                {link.name}
              </NavLink>
            ))}
        </nav>

        {/* Desktop Login / Profile Dropdown */}
        <div className="hidden shrink-0 items-center md:flex">
          {!authChecked ? (
            <div className="h-10 w-20 sm:w-28" />
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 rounded-full border border-secondary/30 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-secondary transition hover:border-secondary hover:bg-secondary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Avatar text={displayName} />
                <span className="block max-w-[100px] truncate lg:max-w-[150px]">
                  {displayName}
                </span>
                <IonIcon
                  icon={chevronDownOutline}
                  className={`transition-transform duration-200 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-secondary/15 bg-white shadow-xl">
                  {/* User Information */}
                  <div className="flex items-center gap-3 border-b border-secondary/10 px-4 py-3">
                    <Avatar text={displayName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-secondary">
                        {user.name ?? "User"}
                      </p>
                      <p className="truncate text-sm text-secondary/60">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Profile */}
                  <button onClick={handleProfile} className={dropdownItem}>
                    <IonIcon icon={personOutline} className="text-lg" />
                    Profile
                  </button>

                  {/* Dashboard */}
                  {hasDashboardAccess && (
                    <div className="border-t border-secondary/10 pb-1">
                      <p className={sectionLabel}>Dashboard</p>

                      {isSuperAdmin ? (
                        <button
                          onClick={handleAdminDashboard}
                          className={dropdownItem}
                        >
                          <IonIcon
                            icon={shieldCheckmarkOutline}
                            className="text-lg"
                          />
                          Admin Dashboard
                        </button>
                      ) : (
                        brandMemberships.map((brand) => (
                          <button
                            key={brand.slug}
                            onClick={() => handleShopDashboard(brand.slug)}
                            className={dropdownItem}
                          >
                            <IonIcon
                              icon={storefrontOutline}
                              className="text-lg"
                            />
                            <span className="truncate">
                              {brand.brandName} Dashboard
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Logout */}
                  <div className="border-t border-secondary/10">
                    <button
                      onClick={handleLogout}
                      className={`${dropdownItem} ${logoutItem}`}
                    >
                      <IonIcon icon={logOutOutline} className="text-lg" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => dispatch(openLogin())}>เข้าสู่ระบบ</Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-secondary transition-colors hover:bg-secondary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          <IonIcon icon={isMenuOpen ? closeOutline : menuOutline} />
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="absolute left-0 top-full max-h-[calc(100dvh-4rem)] w-full overflow-y-auto border-t border-secondary/10 bg-white px-4 py-3 shadow-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {/* Navigation Links */}
            {authChecked &&
              filteredNavLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/"}
                  onClick={closeMenus}
                  className={linkClass}
                >
                  {link.name}
                </NavLink>
              ))}

            {/* User Menu */}
            {authChecked && user ? (
              <>
                <div className="mt-2 flex items-center gap-3 border-t border-secondary/10 px-4 py-3">
                  <Avatar text={displayName} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-secondary">
                      {user.name ?? "User"}
                    </p>
                    <p className="truncate text-sm text-secondary/60">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Profile */}
                <button onClick={handleProfile} className={mobileItem}>
                  <IonIcon icon={personOutline} className="text-lg" />
                  Profile
                </button>

                {/* Dashboard */}
                {hasDashboardAccess && (
                  <div className="mt-1 border-t border-secondary/10 pt-1">
                    <p className={sectionLabel}>Dashboard</p>

                    {isSuperAdmin ? (
                      <button
                        onClick={handleAdminDashboard}
                        className={mobileItem}
                      >
                        <IonIcon
                          icon={shieldCheckmarkOutline}
                          className="text-lg"
                        />
                        Admin Dashboard
                      </button>
                    ) : (
                      brandMemberships.map((brand) => (
                        <button
                          key={brand.brandId}
                          onClick={() => handleShopDashboard(brand.brandId)}
                          className={mobileItem}
                        >
                          <IonIcon
                            icon={storefrontOutline}
                            className="text-lg"
                          />
                          <span className="truncate">
                            {brand.brandName} Dashboard
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Logout */}
                <div className="mt-1 border-t border-secondary/10 pt-1">
                  <button
                    onClick={handleLogout}
                    className={`${mobileItem} ${logoutItem}`}
                  >
                    <IonIcon icon={logOutOutline} className="text-lg" />
                    ออกจากระบบ
                  </button>
                </div>
              </>
            ) : authChecked ? (
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  dispatch(openLogin());
                }}
              >
                เข้าสู่ระบบ
              </Button>
            ) : null}
          </div>
        </nav>
      )}
    </header>
  );
}