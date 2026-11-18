import { useEffect, useState } from "react";

import type { Product } from "../../services/productService";
import { getTryOn } from "../../services/tryonService";
import type { SavedLook } from "../../store/tryonSlice";
import { ANGLES } from "./types";

interface Props {
  looks: SavedLook[];
  products: Product[] | null;
  /** ระหว่างสร้างภาพ — ใช้ลุค/ลบไม่ได้ */
  disabled?: boolean;
  onApply: (look: SavedLook) => void;
  onRemove: (look: SavedLook) => void;
  /** ซ่อนหัวข้อ/ระยะห่างด้านบน — ใช้เมื่อมีหัวข้อหรือแท็บอยู่แล้ว */
  bare?: boolean;
  /** ข้อความเมื่อไม่มีลุค (ไม่ส่ง = ไม่แสดงอะไรเลย) */
  emptyMessage?: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });

/** รายการลุค/ชุดที่บันทึกไว้ — ภาพขอ URL ใหม่จาก backend ทุกครั้ง (URL เก่าหมดอายุ) */
export default function SavedLooks({ looks, products, disabled = false, onApply, onRemove, bare = false, emptyMessage }: Props) {
  // resultId → URL ภาพ; null = โหลดไม่ได้/ภาพไม่อยู่แล้ว
  const [images, setImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = looks.filter((l) => !(l.resultId in images));
    missing.forEach((look) => {
      getTryOn(look.resultId)
        .then((job) => !cancelled && setImages((prev) => ({ ...prev, [look.resultId]: job.image_url })))
        .catch(() => !cancelled && setImages((prev) => ({ ...prev, [look.resultId]: null })));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looks]);

  if (looks.length === 0) {
    return emptyMessage ? <div className="py-20 text-center text-secondary/60">{emptyMessage}</div> : null;
  }

  const nameOf = (id: string) => products?.find((p) => p.id === id)?.name;

  return (
    <section className={bare ? "" : "mt-8"}>
      {!bare && <h2 className="text-xl font-semibold text-[#332F29]">ลุคที่บันทึกไว้</h2>}
      <div className={`${bare ? "" : "mt-4 "}grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4`}>
        {looks.map((look) => {
          const image = images[look.resultId];
          const angle = ANGLES.find((a) => a.key === look.angle)?.label ?? "";
          const names = look.items.map((i) => nameOf(i.product_id)).filter(Boolean);
          return (
            <div key={look.id} className="group relative">
              <button
                type="button"
                onClick={() => onApply(look)}
                disabled={disabled}
                className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-[#F0E9DD] transition group-hover:shadow-lg">
                  {image ? (
                    <img src={image} alt={look.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center px-2 text-center text-xs text-[#8A7F72]">
                      {look.resultId in images ? "ไม่พบภาพ" : "กำลังโหลด..."}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-[#332F29]">{look.name}</p>
                <p className="truncate text-xs text-[#8A7F72]">
                  {look.subjectName} · {angle} · {look.items.length} ชิ้น · {formatDate(look.created_at)}
                </p>
                {names.length > 0 && <p className="truncate text-xs text-[#B0AAA6]">{names.join(", ")}</p>}
              </button>
              <button
                type="button"
                onClick={() => onRemove(look)}
                disabled={disabled}
                aria-label={`ลบลุค ${look.name}`}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#3B2C25]/85 text-sm leading-none text-white opacity-0 transition hover:bg-[#3B2C25] focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
