import type { Product } from "../../services/productService";
import { ANGLES, formatBaht, productPrice, type Angle, type TryOnSubject } from "./types";

interface Props {
  subject: TryOnSubject | null;
  angle: Angle;
  garments: Product[];
  onRemove: (productId: string) => void;
}

export default function TryOnCanvas({ subject, angle, garments, onRemove }: Props) {
  const image = subject?.images[angle] ?? null;
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
              alt={subject?.name}
              className="max-h-[560px] w-auto rounded-[20px] object-contain shadow-[0_18px_48px_rgba(51,47,41,0.12)]"
            />
            <figcaption className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs text-[#332F29]">
              {subject?.name} · {angleLabel}
            </figcaption>
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
          {garments.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 rounded-full bg-white/80 py-1 pl-1 pr-2 text-xs text-[#332F29]"
            >
              {g.images?.[0]?.image_url ? (
                <img src={g.images[0].image_url} alt={g.name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-[#F0E9DD]" />
              )}
              <span className="max-w-[140px] truncate">{g.name}</span>
              <span className="text-[#8A7F72]">{formatBaht(productPrice(g))}</span>
              <button
                type="button"
                onClick={() => onRemove(g.id)}
                aria-label={`เอา ${g.name} ออก`}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[#8A7F72] hover:bg-[#F0E9DD] hover:text-[#332F29]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-[#8A7F72]">ภาพจำลองอาจแตกต่างจากสินค้าจริง</p>
    </div>
  );
}
