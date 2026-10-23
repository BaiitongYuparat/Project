import Button from "./Button";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import LoginModal from "./LoginModal";

export default function NavBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);


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
            to="/"
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
          <Button onClick={() => setIsModalOpen(true)}>เข้าสู่ระบบ</Button>
        </div>
      </div>


      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </header>
  );
}
