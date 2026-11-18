import { useMemo, useState } from "react";

import { useFavorites } from "../../context/useFavorites";
import type { Product } from "../../services/productService";
import { colorOf, formatBaht, garmentImage, hasView, productPrice, slotOf, type Angle, type ColorSelection } from "./types";

type Tab = "top" | "bottom" | "dress" | "set" | "accessory" | "favorite";
type GenderFilter = "ALL" | "MALE" | "FEMALE" | "UNISEX";
type Sort = "default" | "price-asc" | "price-desc";

const TABS: { value: Tab; label: string }[] = [
  { value: "top", label: "เสื้อ" },
  { value: "bottom", label: "กระโปรง/กางเกง" },
  { value: "dress", label: "เดรส" },
  { value: "set", label: "ชุดเซ็ต" },
  { value: "accessory", label: "เครื่องประดับ" },
  { value: "favorite", label: "ถูกใจ" },
];

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "MALE", label: "ผู้ชาย" },
  { value: "FEMALE", label: "ผู้หญิง" },
  { value: "UNISEX", label: "Unisex" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "default", label: "ค่าเริ่มต้น" },
  { value: "price-asc", label: "ราคาต่ำ → สูง" },
  { value: "price-desc", label: "ราคาสูง → ต่ำ" },
];

/** แท็บของสินค้า — เดรสกับชุดเซ็ต (set) แยกแท็บกัน แต่ใช้ช่องบนตัวร่วมกัน (slot "full") */
const tabOf = (product: Product): Exclude<Tab, "favorite"> | null => {
  const category = product.category?.trim().toLowerCase();
  if (category === "dress") return "dress";
  if (category === "set") return "set";
  const slot = slotOf(product.category);
  return slot === "full" ? null : slot;
};

const genderOf = (product: Product): Exclude<GenderFilter, "ALL"> =>
  product.gender === "MALE" || product.gender === "FEMALE" ? product.gender : "UNISEX";

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
  const { favorites } = useFavorites();
  const [tab, setTab] = useState<Tab>("top");

  // ตัวกรอง
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("ALL");
  const [shop, setShop] = useState("");
  const [sort, setSort] = useState<Sort>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilters = (genderFilter !== "ALL" ? 1 : 0) + (shop ? 1 : 0) + (sort !== "default" ? 1 : 0);
  const resetFilters = () => {
    setQuery("");
    setGenderFilter("ALL");
    setShop("");
    setSort("default");
  };

  // สินค้าที่ใช้ได้ในหน้านี้: หมวดรองรับ + มีรูปมุมที่เลือก
  const usable = useMemo(
    () => (products ?? []).filter((p) => slotOf(p.category) !== null && hasView(p, angle)),
    [products, angle],
  );

  const shops = useMemo(
    () => [...new Set(usable.map((p) => p.shop_name).filter(Boolean))].sort(),
    [usable],
  );

  const inTab = (p: Product, t: Tab) => (t === "favorite" ? favorites.includes(p.id) : tabOf(p) === t);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = usable.filter(
      (p) =>
        inTab(p, tab) &&
        (genderFilter === "ALL" || genderOf(p) === genderFilter) &&
        (!shop || p.shop_name === shop) &&
        (!q || p.name.toLowerCase().includes(q) || (p.shop_name ?? "").toLowerCase().includes(q)),
    );
    if (sort === "price-asc") list.sort((a, b) => productPrice(a) - productPrice(b));
    if (sort === "price-desc") list.sort((a, b) => productPrice(b) - productPrice(a));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable, tab, favorites, query, genderFilter, shop, sort]);

  // จำนวนชิ้นที่เลือกแล้วในแต่ละหมวด (แสดงบนแท็บ)
  const selectedCount = useMemo(() => {
    const counts: Record<Tab, number> = { top: 0, bottom: 0, dress: 0, set: 0, accessory: 0, favorite: 0 };
    for (const p of usable) {
      if (!selectedIds.includes(p.id)) continue;
      const t = tabOf(p);
      if (t) counts[t]++;
      if (favorites.includes(p.id)) counts.favorite++;
    }
    return counts;
  }, [usable, selectedIds, favorites]);

  const emptyMessage = error
    ? error
    : tab === "favorite"
      ? favorites.length === 0
        ? "ยังไม่มีสินค้าที่ถูกใจ กดหัวใจที่สินค้าในหน้าร้านเพื่อเก็บไว้ที่นี่"
        : "ไม่พบสินค้าที่ถูกใจที่ตรงกับตัวกรอง"
      : query || activeFilters > 0
        ? "ไม่พบสินค้าที่ตรงกับตัวกรอง"
        : angle === "front"
          ? "ยังไม่มีสินค้าในหมวดนี้"
          : "ไม่มีสินค้าที่มีรูปมุมนี้ในหมวดนี้";

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* ส่วนหัว — ตรึงอยู่ ไม่เลื่อนตามรายการสินค้า */}
      <div className="shrink-0">
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

        {/* ค้นหา + ตัวกรอง */}
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า / ร้าน"
            className="min-w-0 flex-1 rounded-full border border-[#D9CFC2] bg-white px-4 py-2 text-sm text-[#332F29] outline-none placeholder:text-[#B0AAA6] focus:border-[#3B2C25]"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              filtersOpen || activeFilters > 0
                ? "border-[#3B2C25] bg-[#3B2C25] text-white"
                : "border-[#D9CFC2] bg-white text-[#332F29] hover:border-[#3B2C25]"
            }`}
          >
            ตัวกรอง{activeFilters > 0 && ` (${activeFilters})`}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-3 space-y-3 rounded-[20px] bg-[#FAF6EF] p-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#8A7F72]">เพศ</p>
              <div className="flex flex-wrap gap-1.5">
                {GENDER_FILTERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGenderFilter(g.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      genderFilter === g.value
                        ? "border-[#3B2C25] bg-[#3B2C25] text-white"
                        : "border-[#D9CFC2] bg-white text-[#332F29] hover:border-[#3B2C25]"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {shops.length > 1 && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#8A7F72]">ร้านค้า</span>
                <select
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  className="w-full rounded-full border border-[#D9CFC2] bg-white px-3 py-1.5 text-sm text-[#332F29]"
                >
                  <option value="">ทุกร้าน</option>
                  {shops.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#8A7F72]">เรียงตาม</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="w-full rounded-full border border-[#D9CFC2] bg-white px-3 py-1.5 text-sm text-[#332F29]"
              >
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {(activeFilters > 0 || query) && (
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-[#C8553D] underline">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* รายการสินค้า — เลื่อนในตัวเองบนจอใหญ่ */}
      <div className="mt-4 min-h-0 flex-1 lg:-mr-2 lg:overflow-y-auto lg:pr-2">
        <div className="grid grid-cols-2 gap-3">
        {products === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-[20px] bg-[#F0E9DD]" />
          ))
        ) : visible.length === 0 ? (
          <p className="col-span-2 py-8 text-center text-sm text-[#8A7F72]">
            {emptyMessage}
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
      </div>
    </section>
  );
}
