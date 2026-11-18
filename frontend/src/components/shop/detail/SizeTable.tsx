import type { ProductDetailSizeRow } from "../../../services/productService";

import SectionTitle from "./SectionTitle";
import { MEASURES, hasSizeChartData, toNumber } from "./sizeChart";

interface SizeTableProps {
  rows: ProductDetailSizeRow[];
  /** หัวข้อของ section — ตั้งค่าเริ่มต้น "ตารางไซส์", ส่ง null ถ้าหน้าที่เรียกวาดหัวข้อเอง */
  title?: string | null;
}

// ตารางไซส์ — คอลัมน์ที่ไม่มีข้อมูลเลยจะซ่อนไป
export default function SizeTable({
  rows,
  title = "ตารางไซส์",
}: SizeTableProps) {
  if (!hasSizeChartData(rows)) {
    return null;
  }

  const visibleMeasures = MEASURES.filter((measure) =>
    rows.some((row) => toNumber(row[measure.key]) !== null)
  );

  return (
    <section>
      {title && <SectionTitle>{title}</SectionTitle>}

      <div className="pd-lift overflow-x-auto rounded-3xl border border-[#DCC3B3] bg-white pd-card">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-[#F0E4D8] bg-[#FAF5EF] text-left text-[#947D6D]">
              <th className="px-5 py-3.5 font-medium">ไซส์</th>
              {visibleMeasures.map((measure) => (
                <th key={measure.key} className="px-5 py-3.5 font-medium">
                  {measure.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F0E4D8] text-[#49352D]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3.5 font-semibold">{row.size}</td>
                {visibleMeasures.map((measure) => {
                  const value = toNumber(row[measure.key]);

                  return (
                    <td key={measure.key} className="px-5 py-3.5">
                      {value !== null ? value.toLocaleString("th-TH") : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
