import { ScrollView, Text, View } from "react-native";

import type { ProductDetailSizeRow } from "../../service/productService";

type MeasureKey = "chest" | "waist" | "hips" | "length";

const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: "chest", label: "รอบอก" },
  { key: "waist", label: "รอบเอว" },
  { key: "hips", label: "รอบสะโพก" },
  { key: "length", label: "ความยาว" },
];

// ค่าอาจมาเป็น string (Prisma Decimal)
const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasSizeChartData = (rows: ProductDetailSizeRow[]) =>
  rows.length > 0 &&
  MEASURES.some((measure) =>
    rows.some((row) => toNumber(row[measure.key]) !== null),
  );

/** ตารางไซส์ — ซ่อนคอลัมน์ที่ไม่มีข้อมูลเลย */
export default function SizeTable({ rows }: { rows: ProductDetailSizeRow[] }) {
  if (!hasSizeChartData(rows)) return null;

  const measures = MEASURES.filter((measure) =>
    rows.some((row) => toNumber(row[measure.key]) !== null),
  );

  const cell = "w-20 px-3 py-3";

  return (
    <View className="overflow-hidden rounded-3xl border border-[#DCC3B3] bg-white">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-full">
          <View className="flex-row border-b border-[#F0E4D8] bg-[#FAF5EF]">
            <Text className={`${cell} text-sm font-medium text-[#947D6D]`}>
              ไซส์
            </Text>
            {measures.map((measure) => (
              <Text
                key={measure.key}
                className={`${cell} text-sm font-medium text-[#947D6D]`}
              >
                {measure.label}
              </Text>
            ))}
          </View>

          {rows.map((row, i) => (
            <View
              key={row.id}
              className={`flex-row ${
                i < rows.length - 1 ? "border-b border-[#F0E4D8]" : ""
              }`}
            >
              <Text className={`${cell} text-sm font-semibold text-[#49352D]`}>
                {row.size}
              </Text>
              {measures.map((measure) => {
                const value = toNumber(row[measure.key]);
                return (
                  <Text
                    key={measure.key}
                    className={`${cell} text-sm text-[#49352D]`}
                  >
                    {value !== null ? value.toLocaleString("th-TH") : "—"}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
