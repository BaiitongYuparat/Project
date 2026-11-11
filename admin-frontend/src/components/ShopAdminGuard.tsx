import { useSelector } from "react-redux";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import type { RootState } from "../store/store";
import SuspendedModal from "../components/SuspendedModal";

// Guard แสดง popup เมื่อร้านที่เข้าไปจัดการถูกระงับ (อ่าน session ฝั่งผู้ดูแล)
export default function ShopAdminGuard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const admin = useSelector((state: RootState) => state.admin.admin);

  const membership = admin?.brandMemberships?.find((b) => b.slug === slug);

  if (membership && membership.brandStatus !== "APPROVED") {
    return (
      <SuspendedModal
        brandName={membership.brandName}
        onClose={() => navigate("/admin/login", { replace: true })}
      />
    );
  }

  return <Outlet />;
}
