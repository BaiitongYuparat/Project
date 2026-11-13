import { useState } from "react";
import {  useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { GoogleLogin } from "@react-oauth/google";
import { IonIcon } from "@ionic/react";
import { storefrontOutline, shieldCheckmarkOutline } from "ionicons/icons";

import { loginAdmin } from "../../store/adminSlice";
import { loginAdminWithGoogle } from "../../services/adminAuthService";
import SuspendedModal from "../../components/SuspendedModal";
import type { Admin } from "../../types/admin";

// หน้า login ฝั่งผู้ดูแล (Super Admin + เจ้าของ/แอดมินร้าน) — แยกจาก LoginModal ของ shopper
export default function AdminLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspendedOpen, setSuspendedOpen] = useState(false);

  async function handleGoogleLogin(idToken: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { admin } = await loginAdminWithGoogle(idToken);
      dispatch(loginAdmin(admin));
      navigateAfterLogin(admin);
    } catch (err: any) {
      console.error("Admin login failed", err);
      if (err?.response?.data?.code === "ADMIN_SUSPENDED") {
        setSuspendedOpen(true);
        return;
      }
      if (err?.response?.data?.code === "ADMIN_NOT_FOUND") {
        setError("ไม่พบบัญชีผู้ดูแลนี้ในระบบ — บัญชีผู้ดูแลสร้างผ่านการสมัครร้านหรือการเชิญเข้าร้านเท่านั้น");
        return;
      }
      setError(err?.response?.data?.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  const navigateAfterLogin = (admin: Admin) => {
    // Super Admin → หน้าจัดการระบบทั้งหมด
    if (admin.role === "SUPER_ADMIN") {
      navigate("/superadmin", { replace: true });
      return;
    }

    // เจ้าของ/แอดมินร้าน → ร้านแรกที่ได้รับอนุมัติ
    const approvedBrand = admin.brandMemberships?.find(
      (brand) => brand.brandStatus === "APPROVED",
    );
    if (approvedBrand) {
      navigate(`/shopadmin/${approvedBrand.slug}`, { replace: true });
      return;
    }

    setError("บัญชีนี้ยังไม่มีร้านที่ได้รับอนุมัติ จึงเข้าใช้งานแดชบอร์ดไม่ได้");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-secondary/5 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-gray-900 shadow-xl">


        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-2xl text-white">
            <IonIcon icon={shieldCheckmarkOutline} />
          </span>
          <h1 className="text-2xl font-bold text-secondary">
            เข้าสู่ระบบผู้ดูแล
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            
            สำหรับเจ้าของร้าน แอดมินร้าน และผู้ดูแลระบบ
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <div className="flex justify-center">
          {isLoading ? (
            <div className="text-blue-500">กำลังเข้าสู่ระบบ...</div>
          ) : (
            <GoogleLogin
              onSuccess={async (response) => {
                if (response.credential) {
                  await handleGoogleLogin(response.credential);
                }
              }}
              onError={() => {
                console.error("Google Login failed");
                setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง");
              }}
              text="continue_with"
              theme="outline"
              size="large"
              shape="rectangular"
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <IonIcon icon={storefrontOutline} />
          ร้านถูกระงับจะเข้าใช้งานแดชบอร์ดไม่ได้
        </div>
      </div>

      {suspendedOpen && (
        <SuspendedModal
          title="บัญชีผู้ดูแลของคุณถูกระงับ"
          onClose={() => setSuspendedOpen(false)}
        />
      )}
    </div>
  );
}
