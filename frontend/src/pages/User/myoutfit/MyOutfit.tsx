import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import type { Product } from "../../../services/productService";
import { getProducts } from "../../../services/productService";
import { useFavorites } from "../../../context/useFavorites";
import { useRequireAuth } from "../../../hooks/useRequireAuth";
import type { RootState } from "../../../store/store";
import { removeLook, type SavedLook } from "../../../store/tryonSlice";

import SavedLooks from "../../../components/tryon/SavedLooks";
import OutfitSkeleton from "../../../components/myoutfit/OutfitSkeleton";
import SavedOutfits from "../../../components/myoutfit/SavedOutfits";
import TryOnHistory from "../../../components/myoutfit/TryOnHistory";

const TABS = [
  { key: "saved", label: "ที่บันทึกไว้" },
  { key: "history", label: "ประวัติการลอง" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const NO_LOOKS: SavedLook[] = [];

export default function MyOutfitPage() {
  const [tab, setTab] = useState<TabKey>("saved");
  // แท็บย่อยใน "ที่บันทึกไว้"
  const [savedView, setSavedView] = useState<"products" | "looks">("products");
  const [products, setProducts] = useState<Product[]>([]);
  // แท็บล่าสุดที่โหลดข้อมูลเสร็จแล้ว (null = ยังไม่เคยโหลด)
  const [loadedTab, setLoadedTab] = useState<TabKey | null>(null);

  const { favorites, toggleFavorite } = useFavorites();

  const requireAuth = useRequireAuth();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);
  const looks =
    useSelector((state: RootState) => (user ? state.tryon.looksByUser[user.id] : undefined)) ?? NO_LOOKS;

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

  // ทุก action ที่ต้องใช้บัญชี — ถ้ายังไม่ login จะเด้ง LoginModal แทน
  const navigate = useNavigate();

  const handleTryOn = (product: Product) => {
    if (!requireAuth()) return;

    // ไปหน้า Try-On Studio พร้อมเลือกสินค้าชิ้นนี้ไว้ให้
    navigate("/tryon", { state: { productId: product.id } });
  };

  // ใช้ลุคที่บันทึกไว้ → ไปหน้า Try-On แล้วโหลดลุคนั้นให้
  const handleApplyLook = (look: SavedLook) => {
    if (!requireAuth()) return;
    navigate("/tryon", { state: { lookId: look.id } });
  };

  const handleToggleFavorite = (productId: string) => {
    if (!requireAuth()) return;

    toggleFavorite(productId);
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
            <div className="flex flex-col gap-6">
              <div role="tablist" aria-label="ประเภทที่บันทึกไว้" className="inline-flex w-fit gap-1 rounded-full bg-secondary/5 p-1">
                {(
                  [
                    { key: "products", label: "สินค้า" },
                    { key: "looks", label: "ลุค" },
                  ] as const
                ).map((v) => {
                  const active = savedView === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSavedView(v.key)}
                      className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${
                        active ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary"
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>

              {savedView === "products" ? (
                <SavedOutfits
                  products={favoriteProducts}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onTryOn={handleTryOn}
                />
              ) : user ? (
                <SavedLooks
                  bare
                  looks={looks}
                  products={products}
                  onApply={handleApplyLook}
                  onRemove={(look) => dispatch(removeLook({ userId: user.id, lookId: look.id }))}
                  emptyMessage="ยังไม่มีลุคที่บันทึกไว้ สร้างภาพในหน้า Try-On แล้วกด “บันทึกเป็นลุค/ชุด”"
                />
              ) : (
                <div className="py-20 text-center text-secondary/60">เข้าสู่ระบบเพื่อดูลุคที่บันทึกไว้</div>
              )}
            </div>
          ) : (
            <TryOnHistory />
          )}
        </section>
      </div>
    </main>
  );
}
