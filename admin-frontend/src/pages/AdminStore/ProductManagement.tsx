import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { chevronDownOutline, searchOutline, trashOutline } from "ionicons/icons";

import ConfirmModal from "../../components/ConfirmModal";
import ProductTable from "../../components/shopadmin/product/ProductTable";
import ProductQualityPanel from "../../components/shopadmin/product/ProductQuantityPanel";

import { deleteProduct, getProducts } from "../../services/ShopAdmin/productService";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import type { ProductSummary } from "../../types/product";

type QualityStatus = "PENDING" | "PASSED" | "FAILED";
type StatusFilter = "ALL" | QualityStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PENDING", label: "รอตรวจรูป" },
  { value: "PASSED", label: "ผ่าน" },
  { value: "FAILED", label: "ไม่ผ่าน" },
];

// สถานะรวมของสินค้า: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
const getProductStatus = (product: ProductSummary): QualityStatus => {
  const statuses = product.images.map((image) => image.quality_status);

  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.every((status) => status === "PASSED")) return "PASSED";
  return "PENDING";
};

export default function ProductManagement() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // รายการสินค้า — มี cache จะแสดงทันทีแล้ว refetch เบื้องหลัง (กด Refresh ใช้ refresh ปกติ)
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useCachedQuery<ProductSummary[]>(
    slug ?? null,
    (opts) =>
      slug ? getProducts(slug, opts) : Promise.reject(new Error("Missing brand slug")),
  );

  const products = data ?? [];

  // รหัสสินค้าที่เลือก
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // error จาก action (ลบสินค้า) — แยกจาก error ของการโหลด
  const [actionError, setActionError] = useState("");

  // ลบสินค้า: state ของ modal ยืนยัน
  const [productToDelete, setProductToDelete] = useState<ProductSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // รายการ category dropdown
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  // กรองสินค้า: ชื่อ/SKU + หมวดหมู่ + สถานะคุณภาพรูป
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword);

      const matchCategory = !category || product.category === category;

      const matchStatus =
        statusFilter === "ALL" || getProductStatus(product) === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, category, statusFilter]);

  // สินค้าที่เลือก: หาจาก id ในรายการที่แสดงอยู่ จึงอัปเดตตามข้อมูลล่าสุดเสมอ
  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ??
    filteredProducts[0] ??
    null;

  // ขณะสินค้าที่เลือกมีรูป "รอตรวจ" ให้ refresh เบื้องหลังแบบไม่ force ให้ลดโหลดวนซ้ำ
  const hasPendingImages = !!selectedProduct?.images.some(
    (image) => image.quality_status === "PENDING",
  );

  const refreshList = useCallback(() => refresh(), [refresh]);

  useEffect(() => {
    if (!hasPendingImages) return;

    const timer = window.setTimeout(() => {
      refresh().catch(() => {});
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasPendingImages, refresh]);

  // แก้ไขสินค้า → เปิด wizard (tab "เพิ่ม/แก้สินค้า")
  const handleEdit = (product: ProductSummary) => {
    navigate(`/shopadmin/${slug}/products/${product.id}/edit`);
  };

  // ลบสินค้า: ขอยืนยันผ่าน ConfirmModal แทน window.confirm
  const handleDelete = (productId: string) => {
    const product = products.find((item) => item.id === productId) ?? null;

    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!slug || !productToDelete) return;

    try {
      setDeleting(true);
      setActionError("");

      await deleteProduct(slug, productToDelete.id);

      setProductToDelete(null);
      await refresh();
    } catch (err) {
      console.error("Delete product error:", err);
      setActionError("ไม่สามารถลบสินค้าได้");
      setProductToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const displayError =
    actionError || (loadError ? "ไม่สามารถโหลดรายการสินค้าได้" : "");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-left text-2xl font-bold text-[#332F29] sm:text-3xl">
          Product Management
        </h1>

        <p className="mt-2 text-base text-[#8B806E]">
          จัดการข้อมูลสินค้าและตรวจสอบคุณภาพรูปสำหรับ Virtual Try-On
        </p>
      </div>

      {/* Toolbar: Search + Category + Quality filter */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:mb-6 lg:flex lg:flex-wrap lg:items-center">
        <label className="flex w-full items-center gap-3 rounded-xl border border-[#E9DFC9] bg-white px-4 py-3 text-sm focus-within:border-[#87947A] lg:max-w-xs">
          <IonIcon icon={searchOutline} className="text-lg text-[#8B806E]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า / SKU"
            className="w-full bg-transparent outline-none placeholder:text-[#8B806E]"
          />
        </label>

        <div className="relative w-full rounded-xl border border-[#E9DFC9] bg-white focus-within:border-[#87947A] lg:w-48">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="กรองตามหมวดหมู่"
            className="w-full appearance-none bg-transparent py-3 pl-4 pr-10 text-sm outline-none"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <IonIcon
            icon={chevronDownOutline}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8B806E]"
          />
        </div>

        {/* Quality filter */}
        <div className="flex w-full overflow-x-auto rounded-xl border border-[#E9DFC9] bg-white p-1 sm:col-span-2 lg:ml-auto lg:w-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors lg:flex-none ${
                statusFilter === filter.value
                  ? "bg-[#87947A] font-medium text-white"
                  : "text-[#786E5D] hover:text-[#332F29]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {displayError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {displayError}
        </div>
      )}

      {/* Content */}
      {loading && products.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-sm text-[#8B806E]">
          กำลังโหลดสินค้า...
        </div>
      ) : (
        <div
          className={`grid items-start gap-6 ${
            selectedProduct ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""
          }`}
        >
          {/* Product Table */}
          <div className="min-w-0">
            <ProductTable
              products={filteredProducts}
              selectedProductId={selectedProduct?.id ?? null}
              onSelect={(product) => setSelectedId(product.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deleting ? (productToDelete?.id ?? null) : null}
            />
          </div>

          {/* Product Quality Panel (ซ่อนเมื่อไม่มีสินค้าที่เลือก) */}
          {selectedProduct && (
            <div className="min-w-0 lg:sticky lg:top-6">
              <ProductQualityPanel
                key={selectedProduct.id}
                product={selectedProduct}
                onRefresh={() => {
                  refreshList().catch(() => {});
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        open={productToDelete !== null}
        title="ลบสินค้า"
        icon={trashOutline}
        iconTone="danger"
        confirmLabel="ลบสินค้า"
        cancelLabel="ยกเลิก"
        loadingLabel="กำลังลบ..."
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
        message={
          productToDelete ? (
            <>
              คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
              <span className="font-medium text-[#332F29]">
                {productToDelete.name}
              </span>
              {productToDelete.sku && (
                <span className="text-[#A39988]"> (SKU: {productToDelete.sku})</span>
              )}{" "}
              ออกจากร้าน? การลบไม่สามารถย้อนกลับได้
            </>
          ) : null
        }
      />
    </div>
  );
}
