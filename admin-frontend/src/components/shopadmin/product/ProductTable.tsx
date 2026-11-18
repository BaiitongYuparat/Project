
import { useEffect, useRef } from "react";

import type { ProductSummary } from "../../../types/product";

interface ProductTableProps {
  products: ProductSummary[];
  selectedProductId: string | null;
  onSelect: (product: ProductSummary) => void;
  onEdit: (product: ProductSummary) => void;
  onDelete: (productId: string) => void;
  /** id ของสินค้าที่กำลังลบอยู่ — ปุ่มลบของแถวนั้นจะ disable กันกดซ้ำ */
  deletingId?: string | null;
  /** id ของสินค้าที่ถูกเลือกด้วย checkbox (สำหรับลบหลายรายการ) */
  selectedIds: Set<string>;
  onToggleSelect: (productId: string, checked: boolean) => void;
  /** เลือก/ยกเลิกทั้งหมด — มีผลกับรายการที่แสดงอยู่ (หลังกรอง) เท่านั้น */
  onToggleSelectAll: (checked: boolean) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  /** true = ปิด checkbox ชั่วคราวระหว่างลบ */
  selectionDisabled?: boolean;
}

type QualityStatus = "PENDING" | "PASSED" | "FAILED";

const getProductQualityStatus = (
  product: ProductSummary,
): QualityStatus => {
  const images = product.images;

  if (images.length === 0) return "PENDING";

  if (images.some((image) => image.quality_status === "FAILED")) {
    return "FAILED";
  }

  if (images.every((image) => image.quality_status === "PASSED")) {
    return "PASSED";
  }

  return "PENDING";
};

function QualityStatusBadge({ status }: { status: QualityStatus }) {
  const styles = {
    PASSED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
  };

  const labels = {
    PASSED: "ผ่าน",
    PENDING: "รอตรวจรูป",
    FAILED: "ไม่ผ่าน",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function ProductTable({
  products,
  selectedProductId,
  onSelect,
  onEdit,
  onDelete,
  deletingId = null,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkDelete,
  onClearSelection,
  selectionDisabled = false,
}: ProductTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allSelected =
    products.length > 0 && products.every((product) => selectedIds.has(product.id));
  const someSelected = products.some((product) => selectedIds.has(product.id));
  const selectedCount = selectedIds.size;

  // indeterminate เป็น property ของ DOM ไม่ใช่ prop ของ React — ต้อง set ผ่าน ref
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9DFC9] bg-white shadow-sm">
      {/* Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7D8] px-5 py-5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-[#332F29]">
            รายการสินค้า
          </h2>

          <span className="rounded-full bg-[#F8F4EA] px-3 py-1 text-xs text-[#786E5D]">
            {products.length} รายการ
          </span>
        </div>

        {selectedCount > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#6B7A5E]">
              เลือกแล้ว {selectedCount} รายการ
            </span>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={selectionDisabled}
              className="text-xs font-medium text-[#8B806E] hover:text-[#332F29] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              ยกเลิกการเลือก
            </button>

            <button
              type="button"
              onClick={onBulkDelete}
              disabled={selectionDisabled}
              className="rounded-lg bg-red-500 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              ลบที่เลือก
            </button>
          </div>
        ) : (
          <span className="hidden text-xs text-[#8B806E] sm:block">
            เลือกสินค้าเพื่อตรวจสอบรูป
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-[#FCFAF6] text-xs text-[#786E5D]">
            <tr>
              <th className="w-12 px-5 py-4 font-medium">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectionDisabled || products.length === 0}
                  onChange={(event) => onToggleSelectAll(event.target.checked)}
                  aria-label="เลือกสินค้าทั้งหมด"
                  className="h-4 w-4 cursor-pointer rounded accent-[#87947A] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </th>
              <th className="px-5 py-4 font-medium">รูป</th>
              <th className="px-5 py-4 font-medium">สินค้า / SKU</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">ราคา (฿)</th>
              <th className="px-5 py-4 font-medium">คุณภาพรูป</th>
              <th className="px-5 py-4 text-center font-medium">สถานะ</th>
              <th className="px-5 py-4 text-right font-medium">จัดการ</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E8DA]">
            {products.map((product) => {
              const qualityStatus = getProductQualityStatus(product);
              const isSelected = selectedProductId === product.id;
              const isChecked = selectedIds.has(product.id);
              const firstImage = product.images[0];

              return (
                <tr
                  key={product.id}
                  onClick={() => onSelect(product)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#F8F2E5]"
                      : isChecked
                        ? "bg-[#FAF6EC]"
                        : "hover:bg-[#FCFAF6]"
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="px-5 py-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={selectionDisabled}
                      onChange={(event) =>
                        onToggleSelect(product.id, event.target.checked)
                      }
                      aria-label={`เลือก ${product.name}`}
                      className="h-4 w-4 cursor-pointer rounded accent-[#87947A] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>

                  {/* Image */}
                  <td className="px-5 py-4">
                    {firstImage?.image_url ? (
                      <img
                        src={firstImage.image_url}
                        alt={product.name}
                        className="h-14 w-14 rounded-xl border border-[#EFE7D8] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F1E8D5] text-[#A99978]">
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </td>

                  {/* Product Name */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#332F29]">
                      {product.name}
                    </div>

                    <div className="mt-1 text-xs text-[#8B806E]">
                      {product.sku || "ไม่มี SKU"}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4 text-[#786E5D]">
                    {product.category}
                  </td>

                  {/* Price */}
                  <td className="px-5 py-4 text-[#332F29]">
                    {product.price !== null
                      ? Number(product.price).toLocaleString("th-TH")
                      : "-"}
                  </td>

                  {/* Image Quality */}
                  <td className="px-5 py-4">
                    <QualityStatusBadge status={qualityStatus} />
                  </td>

                  {/* Active Status */}
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        product.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div
                      className="flex justify-end gap-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="font-medium text-[#6B7A5E] hover:underline"
                      >
                        แก้ไข
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="font-medium text-red-500 hover:underline disabled:cursor-not-allowed disabled:text-red-300 disabled:no-underline"
                      >
                        {deletingId === product.id ? "กำลังลบ..." : "ลบ"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-16 text-center text-[#A39988]"
                >
                  <div className="mb-2 text-3xl">📦</div>
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
