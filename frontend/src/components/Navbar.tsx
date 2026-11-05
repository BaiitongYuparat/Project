import Button from "./Button";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { openLogin } from "../store/uiSlice";
import { useState } from "react";
import { menuOutline, closeOutline } from "ionicons/icons";
import { IonIcon } from "@ionic/react";

export default function NavBar() {
  const user = useSelector((state: RootState) => state.user.user);
  const authChecked = useSelector((state: RootState) => state.user.authChecked);
  const dispatch = useDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/", requireAuth: false },
    { name: "Try-On", path: "/tryon", requireAuth: false },
    { name: "AI Stylist", path: "/ai", requireAuth: false },
    { name: "My Outfit", path: "/my-outfit", requireAuth: true },
  ];
  const filteredNavLinks = navLinks.filter(
    (link) => !link.requireAuth || user !== null,
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-3xl px-4 py-2 transition-colors duration-200
    hover:bg-secondary hover:text-white
    ${isActive ? "bg-secondary text-white" : "text-gray-700"}`;

  return (
    <header className="relative z-50 h-16 bg-white px-6 shadow-md shadow-black/20">
      <div className="flex h-full items-center justify-between">
        {/* Logo */}
        <div>
          <NavLink to="/" className="font-bold text-xl">
            LongDress
          </NavLink>
        </div>

        {/* Navigation */}
        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex lg:gap-2 items-center"
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

        {/* Login / Profile + Mobile Menu */}
        <div className="flex shrink-0 items-center gap-2">
          {!authChecked ? (
            <div className="h-10 w-20 sm:w-28" />
          ) : user ? (
            <NavLink to="/pages/Profile">
              <Button variant="outline">
                <span className="block max-w-[100px] truncate sm:max-w-none">
                  {user.name ?? user.email}
                </span>
              </Button>
            </NavLink>
          ) : (
            <Button onClick={() => dispatch(openLogin())}>เข้าสู่ระบบ</Button>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <IonIcon icon={closeOutline} className="h-6 w-6" />
            ) : (
              <IonIcon icon={menuOutline} className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="absolute left-0 top-full w-full border-t border-gray-100 bg-white px-4 py-3 shadow-lg md:hidden"
        >
          <div className="flex flex-col gap-2">
            {authChecked &&
              filteredNavLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/"}
                  onClick={() => setIsMenuOpen(false)}
                  className={linkClass}
                >
                  {link.name}
                </NavLink>
              ))}
          </div>
        </nav>
      )}
    </header>
  );
}
