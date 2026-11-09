
import type { Product } from "../../../types/product";

interface ProductTableProps {
  products: Product[];
  selectedProductId: string | null;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

type QualityStatus = "PENDING" | "PASSED" | "FAILED";

const getProductQualityStatus = (
  product: Product,
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
}: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9DFC9] bg-white shadow-sm">
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-[#EFE7D8] px-5 py-5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-[#332F29]">
            รายการสินค้า
          </h2>

          <span className="rounded-full bg-[#F8F4EA] px-3 py-1 text-xs text-[#786E5D]">
            {products.length} รายการ
          </span>
        </div>

        <span className="hidden text-xs text-[#8B806E] sm:block">
          เลือกสินค้าเพื่อตรวจสอบรูป
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-[#FCFAF6] text-xs text-[#786E5D]">
            <tr>
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
              const firstImage = product.images[0];

              return (
                <tr
                  key={product.id}
                  onClick={() => onSelect(product)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#F8F2E5]"
                      : "hover:bg-[#FCFAF6]"
                  }`}
                >
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
                        className="font-medium text-[#2453D4] hover:underline"
                      >
                        แก้ไข
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(product.id)}
                        className="font-medium text-red-500 hover:underline"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
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
