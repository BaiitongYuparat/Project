import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { checkBrandAccess } from "../services/ShopAdmin/brandService";

interface ProtectedAdminRouteProps {
  allowedRoles?: string[];
  requireShopAccess?: boolean;
}

// ผลตรวจสิทธิ์ผูกกับ slug และบัญชีผู้ดูแลที่ตรวจ กันผลเก่าถูกนำมาใช้ผิดร้าน/ผิดคน
type AccessResult = { slug: string; adminId: string; granted: boolean };

const SHOP_ROLES = ["OWNER", "ADMIN"];
// ไม่ได้ login ฝั่งผู้ดูแล → กลับไปหน้า login ผู้ดูแล
const LOGIN_PATH = "/admin/login";

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

// Guard สำหรับ route ฝั่งผู้ดูแล (อ่าน session จาก adminSlice — cookie admin_token)
export default function ProtectedAdminRoute({
  allowedRoles,
  requireShopAccess = false,
}: ProtectedAdminRouteProps) {
  const admin = useSelector((state: RootState) => state.admin.admin);
  const authChecked = useSelector((state: RootState) => state.admin.authChecked);
  const { slug } = useParams();

  const [result, setResult] = useState<AccessResult | null>(null);

  const adminId = admin?.id;
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const roleAllowed =
    !allowedRoles || (!!admin && allowedRoles.includes(admin.role));

  // เรียก backend เฉพาะเมื่อผ่านเงื่อนไขพื้นฐานทั้งหมดแล้วเท่านั้น
  const shouldVerify =
    requireShopAccess &&
    authChecked &&
    !!adminId &&
    !!slug &&
    roleAllowed &&
    !isSuperAdmin;

  useEffect(() => {
    if (!shouldVerify || !slug || !adminId) return;

    let active = true;

    setResult(null);

    checkBrandAccess(slug)
      .then((res) => {
        if (!active) return;
        setResult({
          slug,
          adminId,
          granted: res.authorized === true && SHOP_ROLES.includes(res.role),
        });
      })
      .catch((error) => {
        console.error("Check brand access error:", error);
        if (active) setResult({ slug, adminId, granted: false });
      });

    return () => {
      active = false;
    };
  }, [shouldVerify, slug, adminId]);

  // ใช้ผลตรวจเฉพาะที่ตรงกับ slug และบัญชีปัจจุบัน ไม่ตรงถือว่ายังไม่ได้ตรวจ
  const current =
    result && result.slug === slug && result.adminId === adminId ? result : null;

  // 1) รอเช็ค login
  if (!authChecked) return <PageStatus text="กำลังโหลด..." />;

  // 2) ยังไม่ได้ login ฝั่งผู้ดูแล
  if (!admin) return <Navigate to={LOGIN_PATH} replace />;

  // 3) role ไม่ตรง
  if (!roleAllowed) return <Navigate to={LOGIN_PATH} replace />;

  // 4) หน้าร้านค้า
  if (requireShopAccess) {
    if (!slug || isSuperAdmin) return <Navigate to={LOGIN_PATH} replace />;
    if (!current) return <PageStatus text="กำลังตรวจสอบสิทธิ์..." />;
    if (!current.granted) return <Navigate to={LOGIN_PATH} replace />;
  }

  return <Outlet />;
}
