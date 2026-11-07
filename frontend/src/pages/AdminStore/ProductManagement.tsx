import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type ProductFormData,
} from "../../services/ShopAdmin/productService";

const initialForm: ProductFormData = {
  name: "",
  category: "",
  price: "",
  description: "",
  sku: "",
  is_active: true,
  images: [],
  remove_image_ids: [],
};

export default function ProductManagement() {
  const { slug } = useParams<{ slug: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [form, setForm] = useState<ProductFormData>(initialForm);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // โหลดรายการสินค้า
  const loadProducts = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError("");

      const data = await getProducts(slug);
      setProducts(data);
    } catch (error) {
      console.error("Load products error:", error);
      setError("ไม่สามารถโหลดรายการสินค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [slug]);

  // เปิดฟอร์มเพิ่มสินค้า
  const handleAdd = () => {
    setEditingProduct(null);
    setForm({ ...initialForm });
    setShowForm(true);
  };

  // เปิดฟอร์มแก้ไขสินค้า
  const handleEdit = (product: Product) => {
    setEditingProduct(product);

    setForm({
      name: product.name,
      category: product.category,
      price: product.price === null ? "" : String(product.price),
      description: product.description ?? "",
      sku: product.sku ?? "",
      is_active: product.is_active,
      images: [],
      remove_image_ids: [],
    });

    setShowForm(true);
  };

  // เปลี่ยนค่าฟอร์ม
  const handleChange = (
    field: keyof ProductFormData,
    value: string | boolean | File[],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // เลือกรูปภาพ
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    const totalImages =
      (editingProduct?.images.length ?? 0) -
      form.remove_image_ids.length +
      form.images.length +
      selectedFiles.length;

    if (totalImages > 5) {
      alert("สามารถมีรูปภาพได้สูงสุด 5 รูป");
      event.target.value = "";
      return;
    }

    handleChange("images", [...form.images, ...selectedFiles]);

    event.target.value = "";
  };

  // ลบรูปเดิมออกจากรายการที่จะเก็บ
  const handleRemoveOldImage = (imageId: string) => {
    setForm((prev) => ({
      ...prev,
      remove_image_ids: [...prev.remove_image_ids, imageId],
    }));
  };

  // ลบรูปใหม่ที่เลือก
  const handleRemoveNewImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  // บันทึกสินค้า
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slug) return;

    try {
      setSaving(true);
      setError("");

      if (editingProduct) {
        await updateProduct(slug, editingProduct.id, form);
      } else {
        if (form.images.length === 0) {
          setError("กรุณาเลือกรูปภาพสินค้าอย่างน้อย 1 รูป");
          return;
        }

        await createProduct(slug, form);
      }

      setShowForm(false);
      setEditingProduct(null);
      setForm({ ...initialForm });

      await loadProducts();
    } catch (error: any) {
      console.error("Save product error:", error);

      setError(error.response?.data?.message ?? "ไม่สามารถบันทึกสินค้าได้");
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
      await deleteProduct(slug, productId);
      await loadProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      alert("ไม่สามารถลบสินค้าได้");
    }
  };

  // กรองสินค้าจากชื่อและ SKU
  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase();

    return (
      product.name.toLowerCase().includes(keyword) ||
      (product.sku ?? "").toLowerCase().includes(keyword)
    );
  });

  if (loading) {
    return <div className="p-8 text-gray-500">กำลังโหลดสินค้า...</div>;
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Product Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            จัดการสินค้าในร้านค้าของคุณ
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อสินค้าหรือ SKU..."
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-black"
        />
      </div>

      {error && !showForm && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {/* Product Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-5 py-4">สินค้า</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">หมวดหมู่</th>
              <th className="px-5 py-4">ราคา</th>
              <th className="px-5 py-4">สถานะ</th>
              <th className="px-5 py-4 text-right">จัดการ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {product.images[0]?.image_url ? (
                      <img
                        src={product.images[0].image_url}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                        No image
                      </div>
                    )}

                    <span className="font-medium text-gray-900">
                      {product.name}
                    </span>
                  </div>
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {product.sku || "-"}
                </td>

                <td className="px-5 py-4 text-gray-600">{product.category}</td>

                <td className="px-5 py-4 text-gray-600">
                  {product.price !== null
                    ? `฿${Number(product.price).toLocaleString()}`
                    : "-"}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      product.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:underline"
                    >
                      แก้ไข
                    </button>

                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-gray-400"
                >
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-2xl text-gray-400 hover:text-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  ชื่อสินค้า *
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    หมวดหมู่ *
                  </label>

                  <input
                    required
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    placeholder="เช่น Tops"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">SKU</label>

                  <input
                    value={form.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  ราคา (บาท)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  รายละเอียดสินค้า
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              {/* รูปเดิม */}
              {editingProduct && editingProduct.images.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    รูปภาพปัจจุบัน
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {editingProduct.images
                      .filter(
                        (image) => !form.remove_image_ids.includes(image.id),
                      )
                      .map((image) => (
                        <div key={image.id} className="relative">
                          <img
                            src={image.image_url}
                            alt="Product"
                            className="h-20 w-20 rounded-lg object-cover"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveOldImage(image.id)}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* รูปใหม่ */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {editingProduct ? "เพิ่มรูปภาพใหม่" : "รูปภาพสินค้า *"}
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block w-full text-sm"
                />

                <div className="mt-3 flex flex-wrap gap-3">
                  {form.images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-20 w-20 rounded-lg object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  สามารถมีรูปภาพรวมได้สูงสุด 5 รูป
                </p>
              </div>

              {/* สถานะ */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                />
                เปิดแสดงสินค้า
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-5 py-2"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
