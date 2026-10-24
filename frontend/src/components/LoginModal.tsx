import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../services/authService";
import { useState } from "react";
import { useDispatch } from 'react-redux'
import { login } from "../store/userSlice";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
    if (!isOpen) return null;

  async function handleGoogleLogin(idToken: string) {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(idToken);
      console.log("ข้อมูลที่ได้จาก Backend:",result)
      dispatch(login(result.user))

      onClose();
    } catch (error) {
      console.log("Login Failed", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative w-full max-w-md rounded-2xl
                   bg-white p-8 text-gray-900 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="absolute right-4 top-4 text-2xl text-gray-500
                     hover:text-black"
        >
          ×
        </button>

        <h2
          id="login-title"
          className="mb-2 text-center text-secondary text-2xl font-bold"
        >
          Welcome to LongDress
        </h2>

        <p className="mb-6 text-center text-sm text-gray-500">
          ใช้บัญชี Google เพื่อเข้าสู่ระบบหรือสร้างบัญชีในขั้นตอนเดียว
        </p>

        <div className="flex justify-center">
          {isLoading ? (
            <div className="text-blue-500"> กำลังเข้าสู่ระบบ... </div>
          ) : (
            <GoogleLogin
              onSuccess={async (response) => {
                if (response.credential) {
                  await handleGoogleLogin(response.credential);
                  console.log("Login Successful");
                }
              }}
              onError={() => {
                console.error("Google Login failed");
              }}
              text="continue_with"
              theme="outline"
              size="large"
              shape="rectangular"
            />
          )}
        </div>
      </div>
    </div>
  );
}
