import { useState, type ReactNode } from "react";

import type { Product } from "../../services/productService";
import {
  ANGLES,
  colorOf,
  formatBaht,
  garmentImage,
  productPrice,
  type Angle,
  type ColorSelection,
  type TryOnSubject,
} from "./types";

const iconProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const PersonIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

const UsersIcon = () => (
  <svg {...iconProps}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14c2.2 0 4 1.8 4 4" />
  </svg>
);

type CompareView = "after" | "before" | "compare";

const COMPARE_VIEWS: { key: CompareView; label: string }[] = [
  { key: "after", label: "หลัง" },
  { key: "before", label: "ก่อน" },
  { key: "compare", label: "เทียบกัน" },
];

interface Props {
  subject: TryOnSubject | null;
  angle: Angle;
  garments: Product[];
  onRemove: (productId: string) => void;
  colorSelection: ColorSelection;
  onColorChange: (productId: string, colorId: string) => void;
  /** ภาพผลลัพธ์จาก AI (ตรงกับตัวเลือกปัจจุบัน) — ถ้าไม่มีจะแสดงรูปโมเดลเดิม */
  resultUrl?: string | null;
  /** รูปก่อนลองใส่ (โมเดล/มุมเดียวกับภาพผลลัพธ์) — มีค่าเมื่อเทียบก่อน/หลังได้ */
  beforeUrl?: string | null;
  /** ชื่อโมเดล · มุม ของภาพผลลัพธ์ (อาจไม่ตรงกับที่เลือกอยู่ตอนนี้) */
  resultLabel?: string;
  generating?: boolean;
  /** แถบเลือกผู้ลอง (ModelPicker) — แสดงใต้หัวข้อเมื่อเลือกโหมดแล้ว */
  header?: ReactNode;
  /** true = ยังไม่ได้เลือกโหมด → แสดงหน้าเลือก "รูปของฉัน / โมเดล" */
  choosing?: boolean;
  onPickMode?: (mode: "model" | "me") => void;
}

export default function TryOnCanvas({
  subject,
  angle,
  garments,
  onRemove,
  colorSelection,
  onColorChange,
  resultUrl = null,
  beforeUrl = null,
  resultLabel,
  generating = false,
  header,
  choosing = false,
  onPickMode,
}: Props) {
  const angleLabel = ANGLES.find((a) => a.key === angle)?.label;

  // มุมมองภาพผลลัพธ์ — ได้ภาพใหม่เมื่อไหร่ให้กลับไปที่ "หลัง"
  const [view, setView] = useState<CompareView>("after");
  const [viewFor, setViewFor] = useState(resultUrl);
  if (viewFor !== resultUrl) {
    setViewFor(resultUrl);
    setView("after");
  }

  const canCompare = !!resultUrl && !!beforeUrl && !generating;
  const shownView: CompareView = canCompare ? view : "after";
  const showBefore = shownView === "before";
  const image = showBefore ? beforeUrl : resultUrl ?? subject?.images[angle] ?? null;
  const caption = showBefore
    ? `ก่อน · ${subject?.name ?? ""} · ${angleLabel ?? ""}`
    : resultUrl
      ? `${canCompare ? "หลัง · " : ""}${resultLabel ?? ""} · ภาพจาก AI`
      : `${subject?.name} · ${angleLabel}`;

  return (
    <div className="relative flex min-h-[520px] flex-col rounded-[28px] bg-[#EFE3D8] p-6 lg:min-h-[720px]">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#332F29]">พื้นที่ลองใส่</span>
        <span className="text-[#8A7F72]">{garments.length} ชิ้น</span>
      </div>

      {header && <div className="mt-3">{header}</div>}

      {canCompare && (
        <div className="mt-4 flex justify-center">
          <div
            role="group"
            aria-label="เทียบภาพก่อน/หลัง"
            className="inline-flex rounded-full bg-white/85 p-1 shadow-[0_3px_0_rgba(59,44,37,0.10)]"
          >
            {COMPARE_VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={view === v.key}
                onClick={() => setView(v.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === v.key ? "bg-[#3B2C25] text-white" : "text-[#332F29] hover:bg-[#F0E9DD]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        {choosing ? (
          <div className="text-center">
            <p className="text-2xl font-semibold text-[#332F29]">ใครจะเป็นคนลอง?</p>
            <p className="mt-2 text-sm text-[#8A7F72]">เลือกก่อน แล้วค่อยเลือกเสื้อผ้าจากแถบด้านซ้าย</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  { mode: "me", icon: <PersonIcon />, title: "ใช้รูปภาพของฉัน", desc: "ลองบนรูปร่างจริงของคุณ" },
                  { mode: "model", icon: <UsersIcon />, title: "เลือกโมเดล", desc: "เลือกโมเดลชาย/หญิง" },
                ] as const
              ).map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  onClick={() => onPickMode?.(o.mode)}
                  className="flex w-56 flex-col items-center gap-2 rounded-[24px] border-2 border-white/70 bg-white/85 px-6 py-8 shadow-[0_4px_0_rgba(59,44,37,0.10)] transition hover:-translate-y-0.5 hover:border-[#3B2C25]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0E9DD] text-[#3B2C25]">{o.icon}</span>
                  <span className="text-base font-semibold text-[#332F29]">{o.title}</span>
                  <span className="text-xs text-[#8A7F72]">{o.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : shownView === "compare" && beforeUrl && resultUrl ? (
          <div className="grid w-full grid-cols-2 gap-3">
            {[
              { src: beforeUrl, label: "ก่อน", alt: `${subject?.name ?? ""} ก่อนลองใส่` },
              { src: resultUrl, label: "หลัง", alt: resultLabel ?? "ภาพจาก AI" },
            ].map((p) => (
              <figure key={p.label} className="relative flex justify-center">
                <img
                  src={p.src}
                  alt={p.alt}
                  className="max-h-[480px] w-full rounded-[20px] object-contain shadow-[0_18px_48px_rgba(51,47,41,0.12)]"
                />
                <figcaption className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs text-[#332F29]">
                  {p.label}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : image ? (
          <figure className="relative">
            <img
              src={image}
              alt={showBefore ? subject?.name : resultUrl ? resultLabel : subject?.name}
              className={`max-h-[560px] w-auto rounded-[20px] object-contain shadow-[0_18px_48px_rgba(51,47,41,0.12)] transition ${
                generating ? "opacity-40" : ""
              }`}
            />
            <figcaption className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs text-[#332F29]">
              {caption}
            </figcaption>
            {generating && (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px]"
              >
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#3B2C25] border-t-transparent" />
                <span className="rounded-full bg-white/90 px-4 py-1 text-sm text-[#332F29]">
                  AI กำลังสร้างภาพ อาจใช้เวลาราว 10–30 วินาที
                </span>
              </div>
            )}
          </figure>
        ) : (
          <div className="text-center">
            <p className="text-2xl font-semibold text-[#8A7F72]">เริ่มจากเลือกโมเดลและเสื้อผ้า</p>
            <p className="mt-3 text-sm text-[#8A7F72]">เลือกชิ้นที่ชอบจากแถบด้านซ้าย แล้วกดสร้างภาพ</p>
          </div>
        )}
      </div>

      {garments.length > 0 && (
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {garments.map((g) => {
            const colorId = colorOf(g, colorSelection);
            const thumb = garmentImage(g, colorId);
            const colors = g.colors ?? [];
            return (
              <div
                key={g.id}
                className="relative w-[112px] shrink-0 overflow-hidden rounded-[18px] border-2 border-white/70 bg-white/85 shadow-[0_3px_0_rgba(59,44,37,0.10)]"
              >
                <div className="aspect-square bg-[#F0E9DD]">
                  {thumb ? (
                    <img src={thumb} alt={g.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[11px] text-[#8A7F72]">
                      ไม่มีรูป
                    </span>
                  )}
                </div>

                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#332F29] shadow-sm">
                  {formatBaht(productPrice(g))}
                </span>

                <button
                  type="button"
                  onClick={() => onRemove(g.id)}
                  disabled={generating}
                  aria-label={`เอา ${g.name} ออก`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2C25]/85 text-sm leading-none text-white transition hover:bg-[#3B2C25] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>

                {colors.length > 1 && (
                  <div
                    className="flex flex-wrap items-center justify-center gap-1 pt-1.5"
                    role="group"
                    aria-label={`สีของ ${g.name}`}
                  >
                    {colors.map((c) => {
                      const active = c.id === colorId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          aria-label={`เลือกสี${c.name}`}
                          aria-pressed={active}
                          disabled={generating}
                          onClick={() => onColorChange(g.id, c.id)}
                          className={`h-4 w-4 rounded-full border transition disabled:cursor-not-allowed ${
                            active
                              ? "border-[#3B2C25] ring-2 ring-[#3B2C25]/30"
                              : "border-[#D9CFC2] hover:border-[#3B2C25]/50"
                          }`}
                          style={{ backgroundColor: c.hex ?? "#EFE3D6" }}
                        />
                      );
                    })}
                  </div>
                )}

                <p className="truncate px-2 py-1.5 text-[11px] font-medium text-[#332F29]">{g.name}</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-sm text-[#8A7F72]">ภาพจำลองอาจแตกต่างจากสินค้าจริง</p>
    </div>
  );
}
