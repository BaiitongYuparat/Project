import { useMemo, useState } from "react";

import type { Product } from "../../services/productService";
import { colorOf, formatBaht, garmentImage, hasView, productPrice, slotOf, type Angle, type ColorSelection } from "./types";

type Tab = "top" | "bottom" | "full" | "accessory";

const TABS: { value: Tab; label: string }[] = [
  { value: "top", label: "เสื้อ" },
  { value: "bottom", label: "กระโปรง/กางเกง" },
  { value: "full", label: "ชุด" },
  { value: "accessory", label: "เครื่องประดับ" },
];

const tabOf = (product: Product): Tab | null => slotOf(product.category);

const genderLabel = (gender?: string | null) =>
  gender === "MALE" ? "ผู้ชาย" : gender === "FEMALE" ? "ผู้หญิง" : "Unisex";

interface Props {
  products: Product[] | null;
  error: string;
  selectedIds: string[];
  onToggle: (product: Product) => void;
  colorSelection: ColorSelection;
  /** มุมที่เลือกอยู่ — แสดงเฉพาะสินค้าที่มีรูปมุมนี้ */
  angle: Angle;
  /** ระหว่างสร้างภาพ — ดูแท็บได้ แต่เลือก/เอาออกไม่ได้ */
  disabled?: boolean;
}

export default function GarmentPicker({ products, error, selectedIds, onToggle, colorSelection, angle, disabled = false }: Props) {
  const [tab, setTab] = useState<Tab>("top");

  const visible = useMemo(
    () => (products ?? []).filter((p) => tabOf(p) === tab && hasView(p, angle)),
    [products, tab, angle],
  );

  // จำนวนชิ้นที่เลือกแล้วในแต่ละหมวด (แสดงบนแท็บ)
  const selectedCount = useMemo(() => {
    const counts: Record<Tab, number> = { top: 0, bottom: 0, full: 0, accessory: 0 };
    for (const p of products ?? []) {
      const t = tabOf(p);
      if (t && hasView(p, angle) && selectedIds.includes(p.id)) counts[t]++;
    }
    return counts;
  }, [products, selectedIds, angle]);

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#332F29]">เลือกเสื้อผ้า</h2>

      {/* แถบเลือกหมวด */}
      <div className="mt-4 flex border-b border-[#E7E0D5]">
        {TABS.map((t, i) => {
          const active = tab === t.value;
          const count = selectedCount[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={active}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-1 pb-3 pt-2 text-center text-[11px] font-medium leading-tight transition ${
                i > 0 ? "border-l border-[#E7E0D5]" : ""
              } ${active ? "text-[#332F29]" : "text-[#8A7F72] hover:text-[#332F29]"}`}
            >
              <span className="flex items-center gap-1">
                {t.label}
                {count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C8553D] px-1 text-[10px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </span>
              {active && (
                <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-[#3B2C25]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {products === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-[20px] bg-[#F0E9DD]" />
          ))
        ) : visible.length === 0 ? (
          <p className="col-span-2 py-8 text-center text-sm text-[#8A7F72]">
            {error || angle === "front" ? "ยังไม่มีสินค้าในหมวดนี้" : "ไม่มีสินค้าที่มีรูปมุมนี้ในหมวดนี้"}
          </p>
        ) : (
          visible.map((product) => {
            const selected = selectedIds.includes(product.id);
            const image = garmentImage(product, colorOf(product, colorSelection));
            const colorCount = product.colors?.length ?? 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onToggle(product)}
                disabled={disabled}
                className="group text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div
                  className={`relative aspect-square overflow-hidden rounded-[20px] border-2 bg-[#F0E9DD] transition ${
                    selected ? "border-[#3B2C25]" : "border-transparent group-hover:border-[#D9CFC2]"
                  }`}
                >
                  {image ? (
                    <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-[#8A7F72]">
                      ไม่มีรูป
                    </span>
                  )}
                  {colorCount > 1 && (
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-[#332F29]">
                      {product.colors!.slice(0, 4).map((c) => (
                        <span
                          key={c.id}
                          className="h-2.5 w-2.5 rounded-full border border-[#D9CFC2]"
                          style={{ backgroundColor: c.hex ?? "#EFE3D6" }}
                        />
                      ))}
                      {colorCount} สี
                    </span>
                  )}
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#3B2C25] text-xs text-white">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-[#332F29]">{product.name}</p>
                <p className="truncate text-xs text-[#8A7F72]">
                  {product.shop_name ? `${product.shop_name} · ` : ""}
                  {genderLabel(product.gender)} · {formatBaht(productPrice(product))}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
