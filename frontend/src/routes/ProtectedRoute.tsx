import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { checkBrandAccess } from "../services/brandService";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requireShopAccess?: boolean;
}

// ผลตรวจสิทธิ์ผูกกับ slug และผู้ใช้ที่ตรวจ กันผลเก่าถูกนำมาใช้ผิดร้าน/ผิดคน
type AccessResult = { slug: string; userId: string; granted: boolean };

const SHOP_ROLES = ["OWNER", "ADMIN"];
const FALLBACK_PATH = "/";

function PageStatus({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center text-sm text-secondary/70"
    >
      {text}
    </div>
  );
}

export default function ProtectedRoute({
  allowedRoles,
  requireShopAccess = false,
}: ProtectedRouteProps) {
  const user = useSelector((state: RootState) => state.user.user);
  const authChecked = useSelector((state: RootState) => state.user.authChecked);
  const { slug } = useParams();

  const [result, setResult] = useState<AccessResult | null>(null);

  const userId = user?.id;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const roleAllowed =
    !allowedRoles || (!!user && allowedRoles.includes(user.role));

  // เรียก backend เฉพาะเมื่อผ่านเงื่อนไขพื้นฐานทั้งหมดแล้วเท่านั้น
  const shouldVerify =
    requireShopAccess &&
    authChecked &&
    !!userId &&
    !!slug &&
    roleAllowed &&
    !isSuperAdmin;

  useEffect(() => {
    if (!shouldVerify || !slug || !userId) return;

    let active = true;

    setResult(null);

    checkBrandAccess(slug)
      .then((res) => {
        if (!active) return;
        setResult({
          slug,
          userId,
          granted: res.authorized === true && SHOP_ROLES.includes(res.role),
        });
      })
      .catch((error) => {
        console.error("Check brand access error:", error);
        if (active) setResult({ slug, userId, granted: false });
      });

    return () => {
      active = false;
    };
  }, [shouldVerify, slug, userId]);

  // ใช้ผลตรวจเฉพาะที่ตรงกับ slug และผู้ใช้ปัจจุบัน ไม่ตรงถือว่ายังไม่ได้ตรวจ
  const current =
    result && result.slug === slug && result.userId === userId ? result : null;

  // 1) รอเช็ค login
  if (!authChecked) return <PageStatus text="กำลังโหลด..." />;

  // 2) ยังไม่ login
  if (!user) return <Navigate to={FALLBACK_PATH} replace />;

  // 3) role ไม่ตรง
  if (!roleAllowed) return <Navigate to={FALLBACK_PATH} replace />;

  // 4) หน้าร้านค้า
  if (requireShopAccess) {
    if (!slug || isSuperAdmin) return <Navigate to={FALLBACK_PATH} replace />;
    if (!current) return <PageStatus text="กำลังตรวจสอบสิทธิ์..." />;
    if (!current.granted) return <Navigate to={FALLBACK_PATH} replace />;
  }

  return <Outlet />;
}
