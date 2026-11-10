import { useEffect, useMemo, useState } from "react";

import type { Product } from "../../../services/productService";
import { getProducts } from "../../../services/productService";
import { useFavorites } from "../../../context/FavoritesContext";

import OutfitSkeleton from "../../../components/myoutfit/OutfitSkeleton";
import SavedOutfits from "../../../components/myoutfit/SavedOutfits";
import TryOnHistory from "../../../components/myoutfit/TryOnHistory";

const TABS = [
  { key: "saved", label: "ที่บันทึกไว้" },
  { key: "history", label: "ประวัติการลอง" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyOutfitPage() {
  const [tab, setTab] = useState<TabKey>("saved");
  const [products, setProducts] = useState<Product[]>([]);
  // แท็บล่าสุดที่โหลดข้อมูลเสร็จแล้ว (null = ยังไม่เคยโหลด)
  const [loadedTab, setLoadedTab] = useState<TabKey | null>(null);

  const { favorites, toggleFavorite } = useFavorites();

  // โหลดข้อมูลของแท็บปัจจุบัน (กัน race condition ด้วย cancelled flag)
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // TODO: แท็บ "ประวัติการลอง" เมื่อมี API แล้ว เปลี่ยนเป็น fetch ตาม tab
        const productData = await getProducts();

        if (!cancelled) {
          setProducts(productData);
          setLoadedTab(tab);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setProducts([]);
          setLoadedTab(tab);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  // derive: แสดง skeleton ตอนโหลดครั้งแรก หรือตอนสลับไปแท็บที่ยังไม่มีข้อมูลโหลดล่าสุด
  const isLoading = loadedTab === null || loadedTab !== tab;

  const favoriteProducts = useMemo(
    () => products.filter((product) => favorites.includes(product.id)),
    [products, favorites],
  );

  const handleTryOn = (product: Product) => {
    // ตอนนี้ยังไม่มี Try-On Flow จริง
    alert(`คุณเลือกลองใส่: ${product.name}`);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-7 md:px-10 lg:px-14">
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl font-bold text-secondary md:text-4xl">
            ชุดของฉัน
          </h1>
          <p className="mt-0.5 text-base text-secondary/60">
            ลุคที่คุณชอบ และทุกครั้งที่ได้ลองเป็นตัวเอง
          </p>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="หมวดหมู่ชุดของฉัน" className="flex flex-wrap gap-3">
          {TABS.map((t) => {
            const active = tab === t.key;

            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`myoutfit-tab-${t.key}`}
                aria-selected={active}
                aria-controls={`myoutfit-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-secondary bg-secondary text-white"
                    : "border-secondary/30 bg-white text-secondary hover:border-secondary"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <section
          role="tabpanel"
          id={`myoutfit-panel-${tab}`}
          aria-labelledby={`myoutfit-tab-${tab}`}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <OutfitSkeleton />
          ) : tab === "saved" ? (
            <SavedOutfits
              products={favoriteProducts}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onTryOn={handleTryOn}
            />
          ) : (
            <TryOnHistory />
          )}
        </section>
      </div>
    </main>
  );
}
