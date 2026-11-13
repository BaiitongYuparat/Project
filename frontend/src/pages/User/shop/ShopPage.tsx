import { useEffect, useMemo, useState } from "react";

import type { Shop } from "../../../services/shopService";
import type { Product } from "../../../services/productService";

import { getShops } from "../../../services/shopService";
import { getProducts } from "../../../services/productService";

import ProductGrid from "../../../components/shop/ProductGrid";
import ShopFilter from "../../../components/shop/ShopFilter";

import { useFavorites } from "../../../context/FavoritesContext";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  chevronDownOutline,
  closeCircleOutline,
  heartOutline,
  imageOutline,
  searchOutline,
} from "ionicons/icons";
import HeroBannerCarousel from "../../../components/shop/HeroBannerCarousel";

// แปล label ภาษาไทยของ category — ค่าที่ไม่อยู่ในลิสต์จะแสดงค่าดิบจาก DB
const categoryLabels: Record<string, string> = {
  top: "เสื้อ",
  bottom: "กางเกง",
  dress: "เดรส",
  skirt: "กระโปรง",
  set: "ชุด",
  accessories: "กระเป๋า",
  accessory: "กระเป๋า",
};

const categoryLabel = (value: string) => categoryLabels[value] ?? value;

// ลำดับที่อยากให้ chip แสดง (หมวดที่ไม่รู้จักจะต่อท้ายตามตัวอักษร)
const CATEGORY_ORDER = ["top", "bottom", "dress", "skirt", "set", "accessories"];

// ปรับค่าหมวดหมู่ที่เก็บใน DB ให้เทียบกันได้ เช่น "accessory" = "accessories"
const normalizeCategory = (category?: string) => {
  const value = category?.trim().toLowerCase() ?? "";
  return value === "accessory" ? "accessories" : value;
};

// ค่า value ต้องตรงกับ enum Gender ใน Prisma schema (MALE / FEMALE — ไม่มี unisex แล้ว)
const genders = [
  { value: "all", label: "ทั้งหมด" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

export default function ShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedShop, setSelectedShop] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recommended");

  const { favorites, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ใช้เป็น trigger โหลดข้อมูลใหม่ตอนกด "ลองใหม่" หลังเกิด error
  const [reloadKey, setReloadKey] = useState(0);

  const navigate = useNavigate();

  const requireAuth = useRequireAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [shopData, productData] = await Promise.all([
          getShops(),
          getProducts(),
        ]);

        setShops(shopData);
        setProducts(productData);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [reloadKey]);

  // Filter + Search
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchShop =
        selectedShop === "all" || product.brand_id === selectedShop;

      const matchCategory =
        selectedCategory === "all" ||
        normalizeCategory(product.category) === selectedCategory;

      // สินค้าที่ยังไม่ได้ระบุเพศ (gender = null) จะแสดงเฉพาะตอนเลือก "ทั้งหมด"
      const matchGender =
        selectedGender === "all" || product.gender === selectedGender;

      const keyword = search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.shop_name.toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword);

      return matchShop && matchCategory && matchGender && matchSearch;
    });

    if (sortBy === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "th"));
    }

    return result;
  }, [
    products,
    selectedShop,
    selectedCategory,
    selectedGender,
    search,
    sortBy,
  ]);

  // รายการหมวดสินค้าที่มีจริงใน DB (ดึงจากสินค้าที่ backend ส่งมา) — หมวดไหนมีสินค้าจะโผล่เป็น chip อัตโนมัติ
  const availableCategories = useMemo(() => {
    const values = Array.from(
      new Set(products.map((product) => normalizeCategory(product.category)))
    );

    const known = CATEGORY_ORDER.filter((value) => values.includes(value));
    const extra = values
      .filter((value) => !CATEGORY_ORDER.includes(value))
      .sort();

    return ["all", ...known, ...extra];
  }, [products]);

  // ชิปตัวกรองที่กำลังเลือกอยู่ (แสดงเหนือรายการสินค้า กดเพื่อเอาออกทีละอัน)
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (selectedCategory !== "all") {
      chips.push({
        key: "category",
        label: categoryLabel(selectedCategory),
        onRemove: () => setSelectedCategory("all"),
      });
    }

    if (selectedGender !== "all") {
      chips.push({
        key: "gender",
        label:
          genders.find((g) => g.value === selectedGender)?.label ??
          selectedGender,
        onRemove: () => setSelectedGender("all"),
      });
    }

    if (selectedShop !== "all") {
      chips.push({
        key: "shop",
        label: shops.find((s) => s.id === selectedShop)?.brand_name ?? "ร้านค้า",
        onRemove: () => setSelectedShop("all"),
      });
    }

    if (search.trim()) {
      chips.push({
        key: "search",
        label: `“${search.trim()}”`,
        onRemove: () => setSearch(""),
      });
    }

    return chips;
  }, [selectedCategory, selectedGender, selectedShop, search, shops]);

  const hasActiveFilters =
    selectedShop !== "all" ||
    selectedCategory !== "all" ||
    selectedGender !== "all" ||
    search.trim() !== "";

  const clearFilters = () => {
    setSelectedShop("all");
    setSelectedCategory("all");
    setSelectedGender("all");
    setSearch("");
  };

  const handleRetry = () => {
    setError("");
    setReloadKey((key) => key + 1);
  };

  // ทุก action ที่ต้องใช้บัญชี — ถ้ายังไม่ login จะเด้ง LoginModal แทน
  const handleTryOn = (product: Product) => {
    if (!requireAuth()) return;

    // ตอนนี้ยังไม่มี Try-On Flow จริง
    alert(`คุณเลือกลองใส่: ${product.name}`);
  };

  const handleToggleFavorite = (productId: string) => {
    if (!requireAuth()) return;

    toggleFavorite(productId);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAF5EF]">
        <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14">
          {/* Skeleton: แบนเนอร์ */}
          <div className="mb-8 h-[300px] animate-pulse rounded-2xl bg-[#EFE3D6] md:h-[360px]" />

          {/* Skeleton: ช่องค้นหา */}
          <div className="mb-6 h-12 animate-pulse rounded-full bg-[#EFE3D6]" />

          {/* Skeleton: การ์ดฟิลเตอร์ */}
          <div className="mb-6 h-36 animate-pulse rounded-2xl bg-[#EFE3D6]" />

          {/* Skeleton: การ์ดสินค้า */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-[#EFE3D6]" />
                <div className="mt-3 h-4 w-3/4 rounded bg-[#EFE3D6]" />
                <div className="mt-2 h-4 w-1/2 rounded bg-[#EFE3D6]" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#FAF5EF]">
        <div className="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-5">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8C7B8] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FBEAE3] text-2xl">
              ⚠️
            </div>

            <h2 className="mb-2 text-lg font-semibold text-[#49352D]">
              โหลดข้อมูลไม่สำเร็จ
            </h2>

            <p className="mb-6 text-sm text-[#947D6D]">
              {error} กรุณาลองใหม่อีกครั้ง
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-[#3E2C25] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#5A443A]"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF5EF]">
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14">
        <HeroBannerCarousel />

        {/* Search toolbar */}
        <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <IonIcon
              icon={searchOutline}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#A58E7F]"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า สไตล์ หรือสิ่งที่ชอบ"
              className="w-full rounded-full border border-[#DCC3B3] bg-white py-3 pl-11 pr-10 text-sm outline-none transition placeholder:text-[#A58E7F] focus:border-[#49352D]"
            />

            {search && (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#A58E7F] transition hover:bg-primary hover:text-[#49352D]"
              >
                <IonIcon icon={closeCircleOutline} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#DCC3B3] bg-primary px-6 py-3 text-sm font-medium text-[#49352D] transition hover:bg-[#E8CEBD] lg:flex-none"
            >
              <IonIcon icon={imageOutline} className="text-base" />
              ค้นหาด้วยรูป
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-outfit")}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#DCC3B3] bg-primary px-6 py-3 text-sm font-medium text-[#49352D] transition hover:bg-[#E8CEBD] lg:flex-none"
            >
              <IonIcon icon={heartOutline} className="text-base" />
              รายการโปรด ({favorites.length})
            </button>
          </div>
        </section>

        {/* Filter card */}
        <section className="mb-6 rounded-2xl border border-[#DCC3B3] bg-primary p-4 md:p-5">
          {/* Category chips — เลื่อนแนวนอนได้บนมือถือ */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-x-visible">
            {availableCategories.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedCategory(value)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${selectedCategory === value
                  ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                  : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-[#E8CEBD]"
                  }`}
              >
                {value === "all" ? "ทั้งหมด" : categoryLabel(value)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-[#E2CDBB] pt-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Gender chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-[#947D6D]">
                เพศ
              </span>

              {genders.map((gender) => (
                <button
                  key={gender.value}
                  type="button"
                  onClick={() => setSelectedGender(gender.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${selectedGender === gender.value
                    ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                    : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-[#E8CEBD]"
                    }`}
                >
                  {gender.label}
                </button>
              ))}
            </div>

            {/* Shop + Sort */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ShopFilter
                shops={shops}
                selectedShop={selectedShop}
                onChange={setSelectedShop}
              />

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="เรียงสินค้าตาม"
                  className="w-full appearance-none rounded-full border border-[#DCC3B3] bg-white py-2.5 pl-4 pr-9 text-sm text-[#49352D] outline-none transition focus:border-[#49352D] sm:w-auto"
                >
                  <option value="recommended">แนะนำ</option>
                  <option value="price-low">ราคาต่ำไปสูง</option>
                  <option value="price-high">ราคาสูงไปต่ำ</option>
                  <option value="name">ชื่อสินค้า</option>
                </select>

                <IonIcon
                  icon={chevronDownOutline}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#947D6D]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Heading */}
        <section className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-[#49352D] md:text-2xl">
              เลือกชิ้นที่ใช่ แล้วลองเลย
            </h2>

            <p className="mt-1 text-sm text-[#947D6D]">
              พบสินค้า {filteredProducts.length} รายการ
            </p>
          </div>
        </section>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#947D6D]">
              ตัวกรองที่เลือก:
            </span>

            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#DCC3B3] bg-white px-3 py-1.5 text-xs text-[#49352D] transition hover:border-[#C2645A] hover:text-[#C2645A]"
              >
                {chip.label}
                <IonIcon icon={closeCircleOutline} className="text-sm" />
              </button>
            ))}

            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-xs font-medium text-[#C2645A] underline-offset-2 transition hover:underline"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}

        {/* Product Cards */}
        <ProductGrid
          products={filteredProducts}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onTryOn={handleTryOn}
        />

        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#DCC3B3] bg-white py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl">
              🔍
            </div>

            <p className="text-base font-semibold text-[#49352D]">
              ไม่พบสินค้าที่ตรงกับตัวกรอง
            </p>

            <p className="mt-1 text-sm text-[#947D6D]">
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองทั้งหมดเพื่อดูสินค้าทุกชิ้น
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-full bg-[#3E2C25] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#5A443A]"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
