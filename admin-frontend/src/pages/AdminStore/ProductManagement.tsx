import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { addOutline, chevronDownOutline, searchOutline } from "ionicons/icons";

import Button from "../../components/Button";

import ProductTable from "../../components/shopadmin/product/ProductTable";
import ProductFormModal from "../../components/shopadmin/product/ProductFormModal";
import ProductQualityPanel from "../../components/shopadmin/product/ProductQuantityPanel";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/ShopAdmin/productService";
import type { Product, ProductFormData } from "../../types/product";

import type { ImageView } from "../../types/product";


const initialForm: ProductFormData = {
  name: "",
  category: "",
  gender: "",
  price: "",
  description: "",
  sku: "",
  is_active: true,
  images: [],
  remove_image_ids: [],
};

type QualityStatus = "PENDING" | "PASSED" | "FAILED";
type StatusFilter = "ALL" | QualityStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PENDING", label: "รอตรวจรูป" },
  { value: "PASSED", label: "ผ่าน" },
  { value: "FAILED", label: "ไม่ผ่าน" },
];

// สถานะรวมของสินค้า: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
const getProductStatus = (product: Product): QualityStatus => {
  const statuses = product.images.map((image) => image.quality_status);

  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.every((status) => status === "PASSED")) return "PASSED";
  return "PENDING";
};

export default function ProductManagement() {
  const { slug } = useParams<{ slug: string }>();

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>({ ...initialForm });

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [error, setError] = useState("");

  // โหลดรายการสินค้า
  const loadProducts = useCallback(
    async (silent = true) => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setError("");

        setProducts(await getProducts(slug));
      } catch (err) {
        console.error("Load products error:", err);
        setError("ไม่สามารถโหลดรายการสินค้าได้");
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
  // ถ้าไม่มีสินค้า -> null (ไม่แสดง ProductQualityPanel)

  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ??
    filteredProducts[0] ??
    null;

  // เปิดฟอร์มเพิ่มสินค้า
  const handleAdd = () => {
    setEditingProduct(null);
    setForm({ ...initialForm });
    setError("");
    setShowForm(true);
  };

  // เปิดฟอร์มแก้ไขสินค้า
  const handleEdit = (product: Product) => {
    setEditingProduct(product);

    setForm({
      name: product.name,
      category: product.category,
      gender: product.gender ?? "",
      price: product.price === null ? "" : String(product.price),
      description: product.description ?? "",
      sku: product.sku ?? "",
      is_active: product.is_active,
      images: [],
      remove_image_ids: [],
    });

    setError("");
    setShowForm(true);
  };

  // ปิดฟอร์ม
  const handleCloseForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingProduct(null);
    setForm({ ...initialForm });
    setError("");
  };

  // เปลี่ยนค่าฟอร์มจาก Input / Textarea / Select
  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    const nextValue =
      event.target instanceof HTMLInputElement &&
      event.target.type === "checkbox"
        ? event.target.checked
        : value;

    setForm((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  // เลือกรูปภาพใหม่
  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
    view: ImageView,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");

    setForm((previous) => {
      // ถ้ามีรูปมุมนี้อยู่แล้ว ให้นับเป็นการเปลี่ยนรูป
      const oldImage = editingProduct?.images.find(
        (image) => image.view === view,
      );

      const removeIds = oldImage
        ? [...new Set([...previous.remove_image_ids, oldImage.id])]
        : previous.remove_image_ids;

      return {
        ...previous,
        images: [
          ...previous.images.filter((image) => image.view !== view),
          { file, view },
        ],
        remove_image_ids: removeIds,
      };
    });
  };

  // ลบรูปภาพเดิม
  const handleRemoveOldImage = (imageId: string) => {
    setForm((previous) => ({
      ...previous,
      remove_image_ids: [...previous.remove_image_ids, imageId],
    }));
  };

  // ลบรูปภาพใหม่ที่เลือก
  const handleRemoveNewImage = (index: number) => {
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  // บันทึกสินค้า
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slug) return;

    const hasFrontImage =
      form.images.some((image) => image.view === "FRONT") ||
      (editingProduct?.images.some(
        (image) =>
          image.view === "FRONT" && !form.remove_image_ids.includes(image.id),
      ) ??
        false);

    if (!hasFrontImage) {
      setError("กรุณาเพิ่มรูปภาพสินค้าด้านหน้าอย่างน้อย 1 รูป");
      return;
    }

    if (form.gender !== "MALE" && form.gender !== "FEMALE") {
      setError("กรุณาเลือกเพศของสินค้า (ชาย หรือ หญิง)");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingProduct) {
        await updateProduct(slug, editingProduct.id, form);
      } else {
        await createProduct(slug, form);
      }

      setShowForm(false);
      setEditingProduct(null);
      setForm({ ...initialForm });

      await loadProducts(true);
    } catch (err: any) {
      console.error("Save product error:", err);

      setError(err.response?.data?.message ?? "ไม่สามารถบันทึกสินค้าได้");
    } finally {
      setSaving(false);
    }
  };

  // ลบสินค้า
  const handleDelete = async (productId: string) => {
    if (!slug) return;

    const confirmed = window.confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?");

    if (!confirmed) return;

    try {
      setError("");
      await deleteProduct(slug, productId);
      await loadProducts(true);
    } catch (err) {
      console.error("Delete product error:", err);
      setError("ไม่สามารถลบสินค้าได้");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-left text-2xl font-bold text-[#332F29] sm:text-3xl">
            Product Management
          </h1>

          <p className="mt-2 text-base text-[#8B806E]">
            จัดการข้อมูลสินค้าและตรวจสอบคุณภาพรูปสำหรับ Virtual Try-On
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <Button type="button" onClick={handleAdd} variant="secondary">
            <IonIcon icon={addOutline} className="text-sm md:text-md" />
            เพิ่มสินค้า
          </Button>
        </div>
      </div>

      {/* Toolbar: Search + Category + Quality filter */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:mb-6 lg:flex lg:flex-wrap lg:items-center">
        <label className="flex w-full items-center gap-3 rounded-xl border border-[#E9DFC9] bg-white px-4 py-3 text-sm focus-within:border-[#2453D4] lg:max-w-xs">
          <IonIcon icon={searchOutline} className="text-lg text-[#8B806E]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า / SKU"
            className="w-full bg-transparent outline-none placeholder:text-[#8B806E]"
          />
        </label>

        <div className="relative w-full rounded-xl border border-[#E9DFC9] bg-white focus-within:border-[#2453D4] lg:w-48">
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
                  ? "bg-[#2453D4] font-medium text-white"
                  : "text-[#786E5D] hover:text-[#332F29]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && !showForm && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
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
            />
          </div>

          {/* Product Quality Panel (ซ่อนเมื่อไม่มีสินค้าที่เลือก) */}
          {selectedProduct && (
            <div className="min-w-0 lg:sticky lg:top-6">
              <ProductQualityPanel
                key={selectedProduct.id}
                product={selectedProduct}
              />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <ProductFormModal
          editingProduct={editingProduct}
          form={form}
          saving={saving}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          onChange={handleChange}
          onImageChange={handleImageChange}
          onRemoveOldImage={handleRemoveOldImage}
          onRemoveNewImage={handleRemoveNewImage}
        />
      )}

      {/* Form Error */}
      {showForm && error && (
        <div className="fixed left-1/2 top-5 z-[60] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

