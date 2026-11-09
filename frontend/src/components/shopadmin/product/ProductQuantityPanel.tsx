import { useState } from "react";
import { IonIcon } from "@ionic/react";
import { imageOutline, informationCircleOutline } from "ionicons/icons";

import type { ImageView, Product } from "../../../types/product";

interface ProductQualityPanelProps {
  product: Product | null;
}

type QualityStatus = "PENDING" | "PASSED" | "FAILED";

const qualityConfig: Record<QualityStatus, { label: string; style: string }> = {
  PENDING: { label: "รอตรวจ", style: "bg-[#FDEEDD] text-[#A35A0F]" },
  PASSED: { label: "ผ่าน", style: "bg-[#E4EFDD] text-[#3D6A2B]" },
  FAILED: { label: "ไม่ผ่าน", style: "bg-[#FDE5E2] text-[#B53A2D]" },
};
const getViewLabel = (view: ImageView) => {
  const labels: Record<ImageView, string> = {
    FRONT: "ด้านหน้า",
    BACK: "ด้านหลัง",
    LEFT: "ด้านซ้าย",
    RIGHT: "ด้านขวา",
  };

  return labels[view] ?? "ไม่ระบุมุม";
};

const DEFAULT_NOTE =
  "ตรวจสอบมุมถ่ายและคุณภาพรูปก่อนนำรูปไปใช้งาน Virtual Try-On";

const getStatus = (value?: string | null): QualityStatus =>
  value && value in qualityConfig ? (value as QualityStatus) : "PENDING";

function StatusBadge({ status }: { status: QualityStatus }) {
  const config = qualityConfig[status];

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${config.style}`}
    >
      {config.label}
    </span>
  );
}

export default function ProductQualityPanel({
  product,
}: ProductQualityPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!product) {
    return (
      <div className="rounded-2xl border border-[#EADFCE] bg-white p-6">
        <h2 className="text-base font-semibold text-gray-900">
          ตรวจสอบรูปภาพสินค้า
        </h2>

        <div className="flex flex-col items-center py-12 text-center">
          <IonIcon icon={imageOutline} className="text-4xl text-[#A99978]" />
          <p className="mt-3 text-sm text-gray-500">
            เลือกสินค้าจากรายการเพื่อตรวจรูป
          </p>
        </div>
      </div>
    );
  }

  const activeImage = product.images[activeIndex];

  // สถานะรวม: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
  const statuses = product.images.map((image) => getStatus(image.quality_status));
  const overallStatus: QualityStatus = statuses.includes("FAILED")
    ? "FAILED"
    : statuses.length > 0 && statuses.every((s) => s === "PASSED")
      ? "PASSED"
      : "PENDING";

  return (
    <div className="rounded-2xl border border-[#EADFCE] bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">
        ตรวจสอบรูปภาพสินค้า
      </h2>

      {/* Product Info */}
      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{product.name}</p>
          <p className="mt-1 text-xs text-gray-500">{product.sku || "-"}</p>
        </div>

        <StatusBadge status={overallStatus} />

      </div>
      {overallStatus === "FAILED" && (
    <p className="mt-3 p-2 text-xs rounded-lg bg-red-50 px-3 py-2  text-red-600">
      หมายเหตุ: รูปภาพสินค้าทุกรูปควรผ่านการตรวจสอบก่อนจึงจะสามารถนำไปใช้งานได้
    </p>
  )}

      {/* Main Image */}
      <div className="mt-4 flex h-64 items-center justify-center overflow-hidden rounded-xl bg-[#EFE6D2]">
        {activeImage?.image_url ? (
          <img
            src={activeImage.image_url}
            alt={`${product.name} ${activeIndex + 1}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
            <IonIcon icon={imageOutline} className="text-4xl" />
            รูปภาพสินค้า
          </div>
        )}
      </div>

      {/* Image Status List */}
      <ul className="mt-5 divide-y divide-[#F1E9DB] text-sm">
        {product.images.length === 0 && (
          <li className="py-3 text-gray-400">ยังไม่มีรูปภาพสินค้า</li>
        )}

        {product.images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-current={index === activeIndex}
              className="flex w-full items-center justify-between py-3 text-left"
            >
              <span
                className={
                  index === activeIndex
                    ? "font-medium text-blue-700"
                    : "text-gray-900"
                }
              >
                {getViewLabel(image.view)}
              </span>

              <StatusBadge status={getStatus(image.quality_status)} />
            </button>
          </li>
        ))}
      </ul>

      {/* AI Quality Reason */}
      <div className="mt-3 flex items-start gap-3 rounded-xl bg-[#FAF6EF] p-4 text-xs text-gray-600">
        <IonIcon
          icon={informationCircleOutline}
          className="mt-0.5 shrink-0 text-base"
        />

        <p className="whitespace-pre-line leading-relaxed">
          {activeImage?.quality_reason || DEFAULT_NOTE}
        </p>
      </div>
    </div>
  );
}
