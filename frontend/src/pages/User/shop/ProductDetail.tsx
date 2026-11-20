import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type {
  Product,
  ProductDetail as ProductDetailData,
} from "../../../services/productService";
import { getProductById, getProducts } from "../../../services/productService";

import ProductGallery from "../../../components/shop/detail/ProductGallery";
import ColorSwatches from "../../../components/shop/detail/ColorSwatches";
import ProductSpecs from "../../../components/shop/detail/ProductSpecs";
import SizeTable from "../../../components/shop/detail/SizeTable";
import { hasSizeChartData } from "../../../components/shop/detail/sizeChart";
import ShopCard from "../../../components/shop/detail/ShopCard";
import SectionTitle from "../../../components/shop/detail/SectionTitle";
import RecommendedProducts from "../../../components/shop/detail/RecommendedProducts";
import { pickRecommendedProducts } from "../../../components/shop/detail/recommendation";
import { focusRing } from "../../../components/shop/detail/styles";
import { categoryLabel, genderLabel } from "../../../components/shop/detail/labels";

import { useFavorites } from "../../../context/useFavorites";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

// ราคาอาจถูกส่งมาเป็น string (Prisma Decimal) — แปลงเป็นตัวเลขก่อนฟอร์แมต
const formatPrice = (price?: number | string | null) => {
const value = Number(price);

return Number.isFinite(value)
  ? `฿${value.toLocaleString("th-TH")}`
  : "ราคาไม่ระบุ";
};

// ---------- ชิ้นส่วน UI ย่อย ----------

const ShirtIcon = () => (
<svg
  viewBox="0 0 24 24"
  className="h-5 w-5"
  fill="none"
  stroke="currentColor"
  strokeWidth={1.8}
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="M8 3 3 6l2 4 3-1.5V21h8V8.5L19 10l2-4-5-3a4 4 0 0 1-8 0Z" />
</svg>
);

const ArrowLeftIcon = () => (
<svg
  viewBox="0 0 24 24"
  className="h-4 w-4"
  fill="none"
  stroke="currentColor"
  strokeWidth={2}
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <path d="M19 12H5M12 19l-7-7 7-7" />
</svg>
);

const SparkleIcon = () => (
<svg
  viewBox="0 0 24 24"
  className="h-4 w-4 text-[#E8CEBD]"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
</svg>
);

const AlertCircleIcon = () => (
<svg
  viewBox="0 0 24 24"
  className="h-7 w-7 text-[#9E5B40]"
  fill="none"
  stroke="currentColor"
  strokeWidth={1.8}
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" />
  <line x1="12" y1="8" x2="12" y2="12" />
  <line x1="12" y1="16" x2="12.01" y2="16" />
</svg>
);

export default function ProductDetail() {
const { id } = useParams<{ id: string }>();
const navigate = useNavigate();
const requireAuth = useRequireAuth();
const { favorites, toggleFavorite } = useFavorites();

const [product, setProduct] = useState<ProductDetailData | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState("");
const [reloadKey, setReloadKey] = useState(0);

// สินค้าทั้งหมดของร้านค้า (ใช้คัด "สินค้าแนะนำ" ท้ายหน้า)
const [allProducts, setAllProducts] = useState<Product[]>([]);

// null = แสดงรูปทุกสี (มีค่าเมื่อเลือกสีจาก ColorSwatches)
const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

useEffect(() => {
  if (!id) return;

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      setError("");
      setProduct(null);
      setSelectedColorId(null);

      setProduct(await getProductById(id));
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setIsLoading(false);
    }
  };

  loadProduct();
}, [id, reloadKey]);

// โหลดรายการสินค้าสำหรับแถบ "สินค้าแนะนำ" แยกจากข้อมูลหลัก
// ถ้าดึงไม่สำเร็จก็แค่ไม่แสดงแถบนั้น ไม่ทำให้ทั้งหน้าพัง
useEffect(() => {
  if (!id) return;

  let cancelled = false;

  const loadRecommendations = async () => {
    try {
      const products = await getProducts();

      if (!cancelled) setAllProducts(products);
    } catch (err) {
      console.error(err);

      if (!cancelled) setAllProducts([]);
    }
  };

  loadRecommendations();

  return () => {
    cancelled = true;
  };
}, [id, reloadKey]);

// รูปตามสีที่เลือก — ไม่เลือกสี = โชว์ด้านหน้าของทุกสี, เลือกสี = โชว์ทุกด้านของสีนั้น
const galleryImages = useMemo(() => {
  const images = product?.images ?? [];

  if (selectedColorId === null) {
    // แสดงทุกสี → เอาเฉพาะด้านหน้า (FRONT) สีละ 1 รูป
    // กันหน้าว่าง: ถ้าไม่มีรูป FRONT เลย แสดงรูปทั้งหมดแทน
    const frontImages = images.filter((image) => image.view === "FRONT");
    return frontImages.length > 0 ? frontImages : images;
  }

  // เลือกสีเฉพาะเจาะจง → โชว์ทุกด้านของสีนั้น (ถ้าไม่มีรูปเลย แสดงรูปทั้งหมดแทน)
  const colorImages = images.filter(
    (image) => image.color_id === selectedColorId
  );

  return colorImages.length > 0 ? colorImages : images;
}, [product, selectedColorId]);

// สินค้าแนะนำท้ายหน้า: ร้านเดียวกันก่อน → หมวดเดียวกัน/ใกล้เคียง → เติมที่เหลือ (สูงสุด 6 ชิ้น)
const recommendedProducts = useMemo(
  () =>
    pickRecommendedProducts({
      all: allProducts,
      currentId: id ?? "",
      brandId: product?.brand_id,
      category: product?.category,
    }),
  [allProducts, id, product?.brand_id, product?.category]
);

const handleTryOn = () => {
  if (!product) return;

  requireAuth(() => {
    // ไปหน้า Try-On Studio พร้อมเลือกสินค้าชิ้นนี้ไว้ให้ (เหมือนการ์ดสินค้าหน้าร้าน)
    navigate("/tryon", { state: { productId: product.id } });
  });
};

// การ์ดในแถบสินค้าแนะนำ — พฤติกรรมเดียวกับ ProductCard ในหน้าร้าน
const handleRecommendedTryOn = (recommended: Product) => {
  requireAuth(() => {
    navigate("/tryon", { state: { productId: recommended.id } });
  });
};

const handleToggleFavorite = (productId: string) => {
  requireAuth(() => {
    toggleFavorite(productId);
  });
};

const handleRetry = () => {
  setError("");
  setReloadKey((key) => key + 1);
};

// ---------- Loading Skeleton ----------
if (isLoading) {
  return (
    <main className="min-h-screen bg-[#FAF5EF]" aria-busy="true">
      <div className="mx-auto max-w-[1200px] px-5 py-7 md:px-10 lg:px-14">
        <div className="mb-7 flex items-center justify-between">
          <div className="h-9 w-28 animate-pulse rounded-full bg-[#EFE3D6]" />
          <div className="hidden h-5 w-48 animate-pulse rounded-full bg-[#EFE3D6] sm:block" />
        </div>

        <div className="grid gap-8 sm:grid-cols-12 sm:gap-10">
          <div className="aspect-[4/5] animate-pulse rounded-3xl bg-[#EFE3D6] sm:col-span-6" />

          <div className="rounded-3xl border border-[#DCC3B3] bg-white p-6 pd-card md:p-8 sm:col-span-6">
            <div className="flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#EFE3D6]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#EFE3D6]" />
            </div>
            <div className="mt-5 h-9 w-4/5 animate-pulse rounded-xl bg-[#EFE3D6]" />
            <div className="mt-5 h-16 w-full animate-pulse rounded-2xl bg-[#FAF5EF]" />
            <div className="mt-6 h-20 animate-pulse rounded-2xl bg-[#EFE3D6]" />
            <div className="mt-6 h-14 w-full animate-pulse rounded-full bg-[#EFE3D6]" />
            <div className="mt-6 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-[#EFE3D6]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[#EFE3D6]" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------- Error / Not found ----------
if (error || !product) {
  return (
    <main className="min-h-screen bg-[#FAF5EF]">
      <div className="mx-auto flex min-h-[75vh] max-w-[1200px] items-center justify-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#DCC3B3] bg-white p-10 text-center pd-card">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F3D8CC] bg-[#FDF3EE]">
            <AlertCircleIcon />
          </div>

          <h2 className="mb-2 text-xl font-bold text-[#3E2C25]">
            {error ? "โหลดข้อมูลไม่สำเร็จ" : "ไม่พบสินค้านี้"}
          </h2>

          <p className="mb-8 text-sm leading-relaxed text-[#947D6D]">
            {error
              ? `${error} กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง`
              : "สินค้าอาจถูกลบ อัปเดตลิงก์ หรือปิดการขายชั่วคราว"}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {error && (
              <button
                type="button"
                onClick={handleRetry}
                className={`rounded-full bg-[#3E2C25] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#5A443A] ${focusRing}`}
              >
                ลองใหม่อีกครั้ง
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/")}
              className={`rounded-full border border-[#DCC3B3] bg-[#FAF5EF] px-6 py-2.5 text-sm font-medium text-[#49352D] transition hover:bg-[#EFE3D6] ${focusRing}`}
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

const colorCount = product.colors?.length ?? 0;

// มีตารางไซส์ให้แสดงหรือไม่ — ใช้จัดการวาง span ของการ์ดฝั่งล่าง
const hasSizeTable = hasSizeChartData(product.size_charts ?? []);

// ---------- Main ----------
return (
  <main className="min-h-screen bg-[#FAF5EF] pb-28 text-[#49352D] sm:pb-16">
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-10 lg:px-14 lg:py-9">
      {/* Top Bar: ปุ่มย้อนกลับ + Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-7 flex flex-wrap items-center justify-between gap-4"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`group inline-flex items-center gap-2 rounded-full border border-[#DCC3B3] bg-white/90 px-4 py-2 text-sm font-medium text-[#49352D] shadow-sm backdrop-blur transition hover:border-[#3E2C25]/40 hover:bg-[#F4EAE0] ${focusRing}`}
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            <ArrowLeftIcon />
          </span>
          ย้อนกลับ
        </button>

        <ol className="hidden items-center gap-2 text-xs text-[#947D6D] sm:flex">
          <li>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="transition hover:text-[#3E2C25] hover:underline"
            >
              หน้าหลัก
            </button>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-[#6B5446]">
            {categoryLabel(product.category)}
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[220px] truncate text-[#49352D]">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Hero Section: รูปภาพ + ข้อมูลสินค้าหลัก */}
      {/* Hero Section: รูปภาพ + ข้อมูลสินค้าหลัก — จับคู่กันตั้งแต่จอ sm (640px) ขึ้นไป */}
      <div className="grid items-start gap-8 sm:grid-cols-12 sm:gap-10">
        {/* คอลัมน์ซ้าย: รูปสินค้า (6 cols) */}
        <div className="sm:col-span-6 pd-fade-up">
          <div className="pd-lift overflow-hidden rounded-3xl border border-[#DCC3B3] bg-white p-3 pd-card md:p-4">
            <ProductGallery
              images={galleryImages}
              productName={product.name}
            />
          </div>
        </div>

        {/* คอลัมน์ขวา: รายละเอียดหลัก (6 cols) */}
        <section
          className="flex flex-col gap-6 rounded-3xl border border-[#DCC3B3] bg-white p-6 pd-card md:p-8 sm:col-span-6 pd-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          {/* หมวดหมู่ & ชื่อสินค้า */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#DCC3B3]/80 bg-[#FAF5EF] px-3 py-1 text-xs font-medium text-[#503C32]">
                {categoryLabel(product.category)}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#DCC3B3]/80 bg-[#FAF5EF] px-3 py-1 text-xs font-medium text-[#503C32]">
                {genderLabel(product.gender)}
              </span>
              {product.brand?.brand_name&& (
                <span className="ml-auto text-xs font-medium tracking-wide text-[#947D6D]">
                  โดย {product.brand.brand_name}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-[#3E2C25] md:text-[30px]">
              {product.name}
            </h1>
          </div>

          {/* กล่องราคาแบบ Highlight */}
          <div className="flex items-baseline justify-between rounded-2xl border border-[#EFE3D6] bg-[#FAF5EF]/80 px-5 py-4">
            <div>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-[#947D6D]">
                ราคาสินค้า
              </span>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-[#3E2C25]">
                {formatPrice(product.price)}
              </p>
            </div>

            {colorCount > 0 && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6B5446] shadow-sm ring-1 ring-[#EADCCF]">
                มีให้เลือก {colorCount} สี
              </span>
            )}
          </div>

          {/* ตัวเลือกสีสินค้า */}
          <div className="pt-1">
            <ColorSwatches
              colors={product.colors}
              selectedColorId={selectedColorId}
              onSelect={setSelectedColorId}
            />
          </div>

          {/* ปุ่มลองใส่ (จอ sm ขึ้นไป — จอเล็กกว่านั้นใช้แถบล่างแทน) */}
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={handleTryOn}
              className={`pd-btn-shine group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#3E2C25] px-8 py-4 text-base font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#523B32] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
            >
              <ShirtIcon />
              <span>ลองใส่ชุดนี้</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-normal text-[#FAF5EF]">
                <SparkleIcon />
                Virtual Try-On
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Lower Section — จัดคู่การ์ดตามข้อมูลที่มีจริง (7/5, ไม่มีชิ้นไหนลอยอยู่คนเดียว) */}
      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        {/* คำอธิบาย — เต็มกว้างเมื่อไม่มีตารางไซส์ */}
        {product.description && (
          <section
            className={`pd-fade-up ${hasSizeTable ? "lg:col-span-7" : "lg:col-span-12"}`}
            style={{ animationDelay: "0.25s" }}
          >
            <SectionTitle subtitle="รายละเอียดเนื้อผ้า การตัดเย็บ และคำแนะนำเพิ่มเติม">
              คำอธิบายสินค้า
            </SectionTitle>

            <div className="pd-lift rounded-3xl border border-[#DCC3B3] bg-white p-6 pd-card md:p-8">
              <p className="whitespace-pre-line text-[15px] leading-8 text-[#49352D]">
                {product.description}
              </p>
            </div>
          </section>
        )}

        {/* ข้อมูลเพิ่มเติม — ถ้าไม่มีตารางไซส์จะได้จับคู่กับการ์ดร้านค้าในแถวเดียวกัน */}
        <section
          className={`pd-fade-up ${
            hasSizeTable && product.description
              ? "lg:col-span-5"
              : !hasSizeTable && !product.description
                ? "lg:col-span-7"
                : "lg:col-span-12"
          }`}
          style={{ animationDelay: "0.35s" }}
        >
          <SectionTitle>ข้อมูลเพิ่มเติม</SectionTitle>
          <ProductSpecs product={product} title={null} />
        </section>

        {/* ตารางไซส์ — แสดงเฉพาะเมื่อมีข้อมูล */}
        {hasSizeTable && (
          <section className="lg:col-span-7 pd-fade-up" style={{ animationDelay: "0.45s" }}>
            <SizeTable rows={product.size_charts} />
          </section>
        )}

        {/* ร้านค้า — จับคู่กับชิ้นสุดท้ายของแถวเสมอ */}
        <aside className="lg:col-span-5 pd-fade-up" style={{ animationDelay: "0.55s" }}>
          <ShopCard brand={product.brand} />
        </aside>
      </div>

      {/* สินค้าแนะนำ — แถวเลื่อนแนวนอน ท้ายสุดของหน้า */}
      {recommendedProducts.length > 0 && (
        <div className="mt-12 border-t border-[#EADCCF] pt-8 pd-fade-up">
          <RecommendedProducts
            products={recommendedProducts}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onTryOn={handleRecommendedTryOn}
          />
        </div>
      )}
    </div>

    {/* แถบราคา + ปุ่มลองใส่ ติดด้านล่าง — เฉพาะจอเล็กกว่า sm (ปุ่มอยู่ในการ์ดแล้วตั้งแต่ sm ขึ้นไป) */}
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EADCCF] bg-white/95 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-md backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-[#947D6D]">{product.name}</p>
          <p className="text-xl font-bold tracking-tight text-[#3E2C25]">
            {formatPrice(product.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleTryOn}
          className={`pd-btn-shine inline-flex shrink-0 items-center gap-2 rounded-full bg-[#3E2C25] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#523B32] active:scale-[0.98] motion-reduce:transition-none ${focusRing}`}
        >
          <ShirtIcon />
          <span>ลองใส่ชุดนี้</span>
        </button>
      </div>
    </div>
  </main>
);
}