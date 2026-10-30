import Button from "./Button";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { openLogin } from "../store/uiSlice";
export default function NavBar() {
  const user = useSelector((state: RootState) => state.user.user);
  const authChecked = useSelector((state: RootState) => state.user.authChecked);
  const dispatch = useDispatch();

  return (
    <header className="h-16 bg-white shadow-md px-6">
      <div className="flex h-full items-center justify-between">
        {/* Logo */}
        <div>
          <NavLink to="/" className="font-bold text-xl">
            LongDress
          </NavLink>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <NavLink
            to="/pages/home"
            end
            className={({ isActive }) =>
              `rounded-3xl px-4 py-2  transition-colors duration-200
            hover:text-white hover:bg-secondary
            ${isActive ? "text-white bg-secondary" : "text-gray-700"}`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/tryon"
            className={({ isActive }) =>
              `rounded-3xl px-4 py-2 transition-colors duration-200
            hover:text-white hover:bg-secondary
            ${isActive ? "text-white bg-secondary" : "text-gray-700"}`
            }
          >
            Try-On
          </NavLink>

          <NavLink
            to="/ai"
            className={({ isActive }) =>
              `rounded-3xl px-4 py-2  transition-colors duration-200
            hover:text-white hover:bg-secondary
            ${isActive ? "text-white bg-secondary" : "text-gray-700"}`
            }
          >
            AI Stylist
          </NavLink>
        </nav>

        {/* Login */}
        <div className="shrink-0">
          {!authChecked ? (
            <div className="h-10 w-28" /> // รอเช็คว่า login อยู่ไหม
          ) : user ? (
            <NavLink to="/pages/Profile">
              <Button variant="outline">{user.name ?? user.email}</Button>
            </NavLink>
            
          ) : (
            <Button onClick={() => dispatch(openLogin())}>เข้าสู่ระบบ</Button>
          )}
        </div>
      </div>

    </header>
  );
}
