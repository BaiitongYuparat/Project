import { useMemo, useState } from "react";

import type { Product } from "../../services/productService";
import { colorOf, formatBaht, garmentImage, productPrice, slotOf, type ColorSelection } from "./types";

type Tab = "top" | "bottom" | "other";

const TABS: { value: Tab; label: string }[] = [
  { value: "top", label: "เสื้อ" },
  { value: "bottom", label: "กางเกง" },
  { value: "other", label: "อื่น ๆ" },
];

const tabOf = (product: Product): Tab => {
  const slot = slotOf(product.category);
  return slot === "top" || slot === "bottom" ? slot : "other";
};

const genderLabel = (gender?: string | null) =>
  gender === "MALE" ? "ผู้ชาย" : gender === "FEMALE" ? "ผู้หญิง" : "Unisex";

interface Props {
  products: Product[] | null;
  error: string;
  selectedIds: string[];
  onToggle: (product: Product) => void;
  colorSelection: ColorSelection;
  /** ระหว่างสร้างภาพ — ดูแท็บได้ แต่เลือก/เอาออกไม่ได้ */
  disabled?: boolean;
}

export default function GarmentPicker({ products, error, selectedIds, onToggle, colorSelection, disabled = false }: Props) {
  const [tab, setTab] = useState<Tab>("top");

  const visible = useMemo(
    () => (products ?? []).filter((p) => tabOf(p) === tab),
    [products, tab],
  );

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#332F29]">เลือกเสื้อผ้า</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
              tab === t.value
                ? "border-[#3B2C25] bg-[#3B2C25] text-white"
                : "border-[#D9CFC2] bg-white text-[#332F29] hover:border-[#3B2C25]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {products === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-[20px] bg-[#F0E9DD]" />
          ))
        ) : visible.length === 0 ? (
          <p className="col-span-2 py-8 text-center text-sm text-[#8A7F72]">
            {error || "ยังไม่มีสินค้าในหมวดนี้"}
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
