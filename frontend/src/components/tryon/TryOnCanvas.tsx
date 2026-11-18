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

interface Props {
  subject: TryOnSubject | null;
  angle: Angle;
  garments: Product[];
  onRemove: (productId: string) => void;
  colorSelection: ColorSelection;
  onColorChange: (productId: string, colorId: string) => void;
  /** ภาพผลลัพธ์จาก AI (ตรงกับตัวเลือกปัจจุบัน) — ถ้าไม่มีจะแสดงรูปโมเดลเดิม */
  resultUrl?: string | null;
  /** ชื่อโมเดล · มุม ของภาพผลลัพธ์ (อาจไม่ตรงกับที่เลือกอยู่ตอนนี้) */
  resultLabel?: string;
  generating?: boolean;
}

export default function TryOnCanvas({
  subject,
  angle,
  garments,
  onRemove,
  colorSelection,
  onColorChange,
  resultUrl = null,
  resultLabel,
  generating = false,
}: Props) {
  const image = resultUrl ?? subject?.images[angle] ?? null;
  const angleLabel = ANGLES.find((a) => a.key === angle)?.label;

  return (
    <div className="relative flex min-h-[520px] flex-col rounded-[28px] bg-[#EFE3D8] p-6 lg:min-h-[720px]">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#332F29]">พื้นที่ลองใส่</span>
        <span className="text-[#8A7F72]">{garments.length} ชิ้น</span>
      </div>

      <div className="flex flex-1 items-center justify-center py-6">
        {image ? (
          <figure className="relative">
            <img
              src={image}
              alt={resultUrl ? resultLabel : subject?.name}
              className={`max-h-[560px] w-auto rounded-[20px] object-contain shadow-[0_18px_48px_rgba(51,47,41,0.12)] transition ${
                generating ? "opacity-40" : ""
              }`}
            />
            <figcaption className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs text-[#332F29]">
              {resultUrl ? `${resultLabel ?? ""} · ภาพจาก AI` : `${subject?.name} · ${angleLabel}`}
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
