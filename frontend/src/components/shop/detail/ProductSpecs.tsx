import type { ProductDetail } from "../../../services/productService";

import { categoryLabel, genderLabel } from "./labels";

interface ProductSpecsProps {
  product: ProductDetail;
  /**
   * หัวข้อของ section — ตั้งค่าเริ่มต้น "รายละเอียดสินค้า"
   * ส่ง null ถ้าหน้าที่เรียกจะวาดหัวข้อเอง (กันหัวข้อซ้ำสองชั้น)
   */
  title?: string | null;
}

// รายละเอียดเชิงเทคนิคของสินค้า — แถวที่ไม่มีข้อมูลจะซ่อนไปเอง
export default function ProductSpecs({
  product,
  title = "รายละเอียดสินค้า",
}: ProductSpecsProps) {
  const rows = [
    { label: "หมวดหมู่", value: categoryLabel(product.category) },
    { label: "เพศ", value: genderLabel(product.gender) },
    { label: "เนื้อผ้า", value: product.fabric },
    { label: "ฤดู", value: product.seasons?.join(" / ") },
    { label: "โอกาส", value: product.occasions?.join(" / ") },
    { label: "รหัสสินค้า", value: product.sku },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) {
    return null;
  }

  return (
    <section>
      {title && (
        <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold tracking-tight text-[#3E2C25]">
          <span className="h-4 w-1.5 rounded-full bg-[#3E2C25]" aria-hidden="true" />
          {title}
        </h2>
      )}

      <dl className="pd-lift divide-y divide-[#F0E4D8] rounded-3xl border border-[#DCC3B3] bg-white px-6 pd-card">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex gap-4 py-3 text-sm first:pt-4 last:pb-4"
          >
            <dt className="w-28 shrink-0 text-[#947D6D]">{row.label}</dt>
            <dd className="font-medium text-[#49352D]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
