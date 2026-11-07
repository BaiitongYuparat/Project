import type { BrandMembership } from "../types/user";
import { IonIcon } from "@ionic/react";
import {
  bagHandleOutline,
  storefrontOutline,
  shieldCheckmarkOutline,
  arrowForward,
} from "ionicons/icons";
import SuspendedModal from "./SuspendedModal"
import { useState } from "react";
const cardClass =
  "group flex h-full flex-col items-center rounded-2xl border border-secondary/20 bg-white p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[0_0_28px_4px] hover:shadow-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const iconClass =
  "mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-3xl text-white transition duration-300 group-hover:shadow-[0_0_20px_4px] group-hover:shadow-secondary/50";

const ctaClass =
  "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-seondary transition duration-300 group-hover:shadow-[0_0_18px_3px] group-hover:shadow-primary/60 group-hover:brightness-110";

interface EntryChoiceModalProps {
  brand: BrandMembership | null;
  onSelectWebsite: () => void | Promise<void>;
  onSelectShopDashboard: (brand: BrandMembership) => void;
  onSelectSuperAdminDashboard: () => void;
}



export default function EntryChoiceModal({
  brand,
  onSelectWebsite,
  onSelectShopDashboard,
  onSelectSuperAdminDashboard,
}: EntryChoiceModalProps) {
  const [dismissed, setDismissed] = useState(false);

  // ร้านถูกระงับ  แสดง popup ระงับแทนหน้าเลือก
  if (brand && brand.brandStatus !== "APPROVED") {
    if (dismissed) return null;
    return (
      <SuspendedModal
        brandName={brand.brandName}
        onClose={() => {
          setDismissed(true);
          onSelectWebsite(); 
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-secondary p-8 shadow-xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-primary">
          Welcome to LongDress
        </h2>

        {brand && (
          <p className="mx-auto mt-3 w-fit rounded-full bg-secondary/20 px-4 py-1 text-sm font-medium text-primary">
            คุณเป็นเจ้าของร้าน {brand.brandName}
          </p>
        )}

        <p className="mb-6 text-center text-sm text-primary/60">
          ต้องการเข้าใช้งานในส่วนไหน?
        </p>

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          {/* Website */}
          <button type="button" onClick={onSelectWebsite} className={cardClass}>
            <span className={iconClass}>
              <IonIcon icon={bagHandleOutline} />
            </span>
            <h3 className="font-semibold text-secondary">Website</h3>
            <p className="mt-1 flex-1 text-sm text-secondary/70">
              เข้าใช้งานในมุมมองลูกค้า
            </p>
            <span className={ctaClass}>
              เข้าสู่เว็บไซต์
              <IonIcon
                icon={arrowForward}
                className="transition group-hover:translate-x-0.5"
              />
            </span>
          </button>

          {brand ? (
            <button
              type="button"
              onClick={() => onSelectShopDashboard(brand)}
              className={cardClass}
            >
              <span className={iconClass}>
                <IonIcon icon={storefrontOutline} />
              </span>
              <h3 className="font-semibold text-secondary">Shop Dashboard</h3>
              <p className="mt-1 flex-1 text-sm text-secondary/70">
                จัดการสินค้าและดูสถิติของร้าน
              </p>
              <span className={ctaClass}>
                เข้าสู่แดชบอร์ด
                <IonIcon
                  icon={arrowForward}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectSuperAdminDashboard}
              className={cardClass}
            >
              <span className={iconClass}>
                <IonIcon icon={shieldCheckmarkOutline} />
              </span>
              <h3 className="font-semibold text-secondary">Admin Dashboard</h3>
              <p className="mt-1 flex-1 text-sm text-secondary/70">
                จัดการร้านค้า ผู้ใช้ และระบบทั้งหมด
              </p>
              <span className={ctaClass}>
                เข้าสู่แดชบอร์ด
                <IonIcon
                  icon={arrowForward}
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
