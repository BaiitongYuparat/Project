import { useState } from "react";

import type { ProductDetailImage } from "../../../services/productService";

import { pieceLabel, viewLabel } from "./labels";
import { focusRing } from "./styles";

interface ProductGalleryProps {
  images: ProductDetailImage[];
  productName: string;
}

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-4 w-4 ${direction === "left" ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

// แกลเลอรีรูปสินค้า — รูปใหญ่ (มีปุ่มลูกศรเลื่อน) + thumbnail ทุกด้าน (หน้า/หลัง/ซ้าย/ขวา)
export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  // เก็บ id ของรูปที่เลือก (ไม่ใช่ index) — พอเลือกสีอื่นแล้วรูปเก่าหายไป
  // จะ fallback กลับไปรูปแรกของสีนั้นเองโดยไม่ต้อง reset state
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeImage =
    images.find((image) => image.id === activeId) ?? images[0];

  // เลื่อนรูปไปทางซ้าย/ขวาแบบวนกลับรอบ (รูปสุดท้าย → กดขวา → รูปแรก)
  const goToImage = (offset: number) => {
    if (images.length <= 1) return;

    const currentIndex = images.findIndex(
      (image) => image.id === activeImage?.id
    );
    const nextIndex =
      ((currentIndex + offset) % images.length + images.length) %
      images.length;

    setActiveId(images[nextIndex].id);
  };

  const arrowButtonClass =
    "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#DCC3B3] bg-white/85 text-[#49352D] shadow-sm backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none";

  return (
    <section className="flex flex-col gap-3">
      {/* รูปใหญ่ — เลื่อนด้วยปุ่มลูกศรหรือปุ่มซ้าย/ขวาบนคีย์บอร์ดก็ได้ */}
      <div
        tabIndex={0}
        aria-label="แกลเลอรีรูปสินค้า"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goToImage(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            goToImage(1);
          }
        }}
        className={`relative aspect-square overflow-hidden rounded-2xl border border-[#DCC3B3] bg-[#F3E1D4] ${focusRing}`}
      >
        {activeImage?.image_url ? (
          <img
            key={activeImage.id}
            src={activeImage.image_url}
            alt={`${productName} - ${viewLabel(activeImage.view) ?? "รูปสินค้า"}`}
            className="pd-image-in h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#947D6D]">
            ไม่มีรูปภาพ
          </div>
        )}

        {/* ป้ายด้านของรูป เช่น ด้านหน้า · ท่อนบน */}
        {(viewLabel(activeImage?.view) || pieceLabel(activeImage?.piece)) && (
          <span className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-[#503C32] backdrop-blur-sm">
            {[viewLabel(activeImage?.view), pieceLabel(activeImage?.piece)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}

        {/* ปุ่มลูกศรเลื่อนรูป — โชว์เมื่อมีมากกว่า 1 รูป */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goToImage(-1)}
              aria-label="รูปก่อนหน้า"
              className={`${arrowButtonClass} left-3`}
            >
              <ChevronIcon direction="left" />
            </button>

            <button
              type="button"
              onClick={() => goToImage(1)}
              aria-label="รูปถัดไป"
              className={`${arrowButtonClass} right-3`}
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveId(image.id)}
              aria-label={`ดูรูป${viewLabel(image.view) ?? "สินค้า"}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-[#F3E1D4] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                image.id === activeImage?.id
                  ? "border-[#3E2C25] ring-2 ring-[#3E2C25]/30"
                  : "border-[#DCC3B3] hover:border-[#C9A98F]"
              }`}
            >
              {image.image_url ? (
                <img
                  src={image.image_url}
                  alt={`${productName} thumbnail`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xs text-[#947D6D]">
                  ไม่มีรูป
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
