import type { ProductDetailSizeRow } from "../../../services/productService";

export type MeasureKey = "chest" | "waist" | "hips" | "length";

export const MEASURES: { key: MeasureKey; label: string }[] = [
  { key: "chest", label: "รอบอก" },
  { key: "waist", label: "รอบเอว" },
  { key: "hips", label: "รอบสะโพก" },
  { key: "length", label: "ความยาว" },
];

// ค่าอาจถูกส่งมาเป็น string (Prisma Decimal) จึงแปลงเป็นตัวเลขก่อนแสดง
export const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// เช็คว่ามีข้อมูลตารางไซส์ให้แสดงหรือไม่ — หน้า ProductDetail ใช้ตัดสินวาง span ของการ์ดตอนจัด layout
export const hasSizeChartData = (rows: ProductDetailSizeRow[]) => {
  return (
    rows.length > 0 &&
    MEASURES.some((measure) =>
      rows.some((row) => toNumber(row[measure.key]) !== null)
    )
  );
};
