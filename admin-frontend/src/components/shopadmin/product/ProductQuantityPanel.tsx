import { useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  chevronDownOutline,
  chevronForwardOutline,
  createOutline,
  imageOutline,
  informationCircleOutline,
  refreshOutline,
} from "ionicons/icons";
import { isAxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";

import type { ImageView, ProductImage, ProductSummary } from "../../../types/product";
import { recheckProductImage } from "../../../services/ShopAdmin/productService";

interface ProductQualityPanelProps {
  product: ProductSummary | null;
  /** เรียกเมื่อสถานะรูปอาจเปลี่ยน (เช่น กด recheck แล้ว) ให้ parent โหลดข้อมูลใหม่ */
  onRefresh?: () => void;
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

const RECHECK_NOTE =
  "รูปนี้ไม่ผ่านเพราะระบบตรวจสอบขัดข้อง (ไม่ใช่คุณภาพรูป) กดตรวจซ้ำเพื่อสุ่มตรวจใหม่อีกครั้ง";

// cooldown ฝั่ง UI (backend บังคับ 30 วิ ด้วย 429)
const RECHECK_COOLDOWN_SECONDS = 30;

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

interface ColorGroup {
  key: string;
  name: string;
  hex: string | null;
  images: ProductImage[];
}

// จัดกลุ่มรูปตามสี (ลำดับตามสีที่ตั้งไว้ในสินค้า, รูปไม่มีสีรวมกลุ่ม "ไม่ระบุสี" ท้ายสุด)
const buildColorGroups = (product: ProductSummary): ColorGroup[] => {
  const groups: ColorGroup[] = product.colors
    .map((color) => ({
      key: color.id,
      name: color.name,
      hex: color.hex,
      images: product.images.filter((image) => image.color_id === color.id),
    }))
    .filter((group) => group.images.length > 0);

  const legacyImages = product.images.filter(
    (image) =>
      image.color_id === null ||
      !product.colors.some((color) => color.id === image.color_id),
  );

  if (legacyImages.length > 0) {
    groups.push({
      key: "__legacy",
      name: "ไม่ระบุสี",
      hex: null,
      images: legacyImages,
    });
  }

  return groups;
};

// สถานะรวมของชุดรูป: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
const summarizeStatus = (images: ProductImage[]): QualityStatus => {
  const statuses = images.map((image) => getStatus(image.quality_status));

  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.every((status) => status === "PASSED")) return "PASSED";
  return "PENDING";
};

export default function ProductQualityPanel({
  product,
  onRefresh,
}: ProductQualityPanelProps) {
  // จัดกลุ่มรูปตามสี — product เปลี่ยนเมื่อ poll ได้ข้อมูลใหม่ จึงคำนวณใหม่เสมอ
  const colorGroups = useMemo(
    () => (product ? buildColorGroups(product) : []),
    [product],
  );

  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  // กางกลุ่มแรกไว้ตอนเปิดแผง (component ถูก remount ตามสินค้าที่เลือกอยู่แล้ว)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(colorGroups[0]?.key ? [colorGroups[0].key] : []),
  );
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");

  // ตัวจับเวลา cooldown ของปุ่ม recheck (นับถอยหลังทีละวินาที)
  useEffect(() => {
    if (!Object.values(cooldowns).some((seconds) => seconds > 0)) return;

    const timer = window.setInterval(() => {
      setCooldowns((previous) => {
        const next: Record<string, number> = {};
        let changed = false;

        for (const [imageId, seconds] of Object.entries(previous)) {
          const remaining = Math.max(0, seconds - 1);

          if (remaining !== seconds) changed = true;
          if (remaining > 0) next[imageId] = remaining;
        }

        return changed ? next : previous;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldowns]);

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

  // กางกลุ่มแรกไว้ตอนเปิดแผง (component ถูก remount ตามสินค้าที่เลือกอยู่แล้ว)
  const activeImage =
    product.images.find((image) => image.id === activeImageId) ??
    product.images[0] ??
    null;

  const isGroupExpanded = (key: string) => expandedGroups.has(key);

  const toggleGroup = (key: string) => {
    setExpandedGroups((previous) => {
      const current = new Set(previous);

      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }

      return current;
    });
  };

  // สถานะรวม: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
  const overallStatus = summarizeStatus(product.images);
  const pendingCount = product.images.filter(
    (image) => getStatus(image.quality_status) === "PENDING",
  ).length;

  // กดตรวจซ้ำ — ไว้กรณี FAILED เพราะระบบตรวจล้มเหลว (ไม่ใช่รูปไม่ผ่านจริง)
  const handleRecheck = async (image: ProductImage) => {
    if (!slug || recheckingId) return;

    setRecheckingId(image.id);
    setNotice("");

    try {
      await recheckProductImage(slug, product.id, image.id);
      setCooldowns((previous) => ({
        ...previous,
        [image.id]: RECHECK_COOLDOWN_SECONDS,
      }));
      // สถานะกลายเป็น PENDING แล้ว — ให้ parent โหลดข้อมูลใหม่ทันที แล้ว poll ต่อเอง
      onRefresh?.();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 429) {
        const retryAfter =
          typeof error.response.data?.retry_after === "number"
            ? error.response.data.retry_after
            : RECHECK_COOLDOWN_SECONDS;

        setCooldowns((previous) => ({
          ...previous,
          [image.id]: retryAfter,
        }));
        setNotice("เพิ่งตรวจรูปนี้ไปเมื่อไม่นาน รอสักครู่แล้วกดตรวจซ้ำได้อีก");
      } else {
        setNotice("ไม่สามารถส่งตรวจซ้ำได้ในขณะนี้ กรุณาลองอีกครั้ง");
      }
    } finally {
      setRecheckingId(null);
    }
  };

  // กดแก้ไข — เปิด wizard ตรง step อัปรูป
  const handleEditImage = () => {
    navigate(`/shopadmin/${slug}/products/${product.id}/edit?step=images`);
  };

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
        <p className="mt-3 rounded-lg bg-red-50 p-2 px-3 py-2 text-xs text-red-600">
          หมายเหตุ: รูปภาพสินค้าทุกรูปควรผ่านการตรวจสอบก่อนจึงจะสามารถนำไปใช้งานได้
        </p>
      )}

      {/* Main Image */}
      <div className="mt-4 flex h-64 items-center justify-center overflow-hidden rounded-xl bg-[#EFE6D2]">
        {activeImage?.image_url ? (
          <img
            src={activeImage.image_url}
            alt={`${product.name} ${getViewLabel(activeImage.view)}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
            <IonIcon icon={imageOutline} className="text-4xl" />
            รูปภาพสินค้า
          </div>
        )}
      </div>

      {/* Image List — จัดกลุ่มตามสี */}
      <div className="mt-5 space-y-2 text-sm">
        {colorGroups.length === 0 && (
          <p className="py-3 text-gray-400">ยังไม่มีรูปภาพสินค้า</p>
        )}

        {colorGroups.map((group) => {
          const groupStatus = summarizeStatus(group.images);
          const failedCount = group.images.filter(
            (image) => getStatus(image.quality_status) === "FAILED",
          ).length;
          const expanded = isGroupExpanded(group.key);

          return (
            <div
              key={group.key}
              className="overflow-hidden rounded-xl border border-[#F1E9DB]"
            >
              {/* Group header (accordion) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={expanded}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors ${
                  expanded ? "bg-[#FAF6EF]" : "hover:bg-[#FAF6EF]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <IonIcon
                    icon={expanded ? chevronDownOutline : chevronForwardOutline}
                    className="shrink-0 text-sm text-[#8B806E]"
                  />
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-200"
                    style={{ backgroundColor: group.hex ?? "#E5E7EB" }}
                  />
                  <span className="truncate font-medium text-gray-900">
                    {group.name}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {group.images.length} รูป
                  </span>
                  {failedCount > 0 && (
                    <span className="text-xs font-medium text-red-600">
                      {failedCount} ไม่ผ่าน
                    </span>
                  )}
                  <StatusBadge status={groupStatus} />
                </span>
              </button>

              {/* Group rows */}
              {expanded && (
                <ul className="divide-y divide-[#F1E9DB]">
                  {group.images.map((image) => {
                    const status = getStatus(image.quality_status);
                    const active = image.id === activeImage?.id;
                    const cooldown = cooldowns[image.id] ?? 0;
                    const isRechecking = recheckingId === image.id;

                    return (
                      <li key={image.id}>
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 pr-3">
                          <button
                            type="button"
                            onClick={() => setActiveImageId(image.id)}
                            aria-current={active}
                            className={`min-w-0 flex-1 truncate text-left ${
                              active
                                ? "font-medium text-[#6B7A5E]"
                                : "text-gray-900"
                            }`}
                          >
                            {getViewLabel(image.view)}
                          </button>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <StatusBadge status={status} />

                            {status === "FAILED" && image.quality_error && (
                              <button
                                type="button"
                                onClick={() => handleRecheck(image)}
                                disabled={isRechecking || cooldown > 0}
                                title={
                                  cooldown > 0
                                    ? `ตรวจซ้ำได้ในอีก ${cooldown} วินาที`
                                    : "ส่งตรวจใหม่ (AI ตรวจล้มเหลว)"
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B806E] transition-colors hover:bg-[#F1E9DB] hover:text-[#332F29] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <IonIcon
                                  icon={refreshOutline}
                                  className={`text-base ${
                                    isRechecking ? "animate-spin" : ""
                                  }`}
                                />
                              </button>
                            )}

                            {status === "FAILED" && !image.quality_error && (
                              <button
                                type="button"
                                onClick={handleEditImage}
                                title="แก้ไขรูป (เปิดหน้าอัปโหลด)"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B806E] transition-colors hover:bg-[#F1E9DB] hover:text-[#332F29]"
                              >
                                <IonIcon icon={createOutline} className="text-base" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Notice (เช่น cooldown จาก server) */}
      {notice && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2 px-3 py-2 text-xs text-amber-700">
          {notice}
        </p>
      )}

      {/* Hint ขณะรอผลตรวจ (recheck / สร้างสินค้าใหม่) */}
      {pendingCount > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          กำลังตรวจสอบ {pendingCount} รูป — ผลจะอัปเดตอัตโนมัติ
        </p>
      )}

      {/* AI Quality Reason */}
      <div className="mt-3 flex items-start gap-3 rounded-xl bg-[#FAF6EF] p-4 text-xs text-gray-600">
        <IonIcon
          icon={informationCircleOutline}
          className="mt-0.5 shrink-0 text-base"
        />

        <p className="whitespace-pre-line leading-relaxed">
          {activeImage &&
          getStatus(activeImage.quality_status) === "FAILED" &&
          activeImage.quality_error
            ? `${activeImage.quality_reason ?? "ระบบตรวจสอบภาพขัดข้อง"}\n${RECHECK_NOTE}`
            : activeImage?.quality_reason || DEFAULT_NOTE}
        </p>
      </div>
    </div>
  );
}
