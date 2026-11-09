import { useSelector } from "react-redux";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import type { RootState } from "../store/store";
import SuspendedModal from "../components/SuspendedModal";

export default function ShopAdminGuard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);

  const membership = user?.brandMemberships?.find((b) => b.slug === slug);

  if (membership && membership.brandStatus !== "APPROVED") {
    return (
      <SuspendedModal
        brandName={membership.brandName}
        onClose={() => navigate("/", { replace: true })}
      />
    );
  }

  return <Outlet />;
}