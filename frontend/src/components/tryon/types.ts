import type { Product } from "../../services/productService";

export const ANGLES = [
  { key: "front", label: "หน้า" },
  { key: "left", label: "ซ้าย" },
  { key: "right", label: "ขวา" },
  { key: "back", label: "หลัง" },
] as const;

export type Angle = (typeof ANGLES)[number]["key"];

export type AngleImages = Record<Angle, string | null>;

/** คนที่จะลองใส่ — โมเดลจาก Model Management หรือรูปของผู้ใช้เอง */
export interface TryOnSubject {
  /** "model:<id>" หรือ "me" */
  key: string;
  name: string;
  images: AngleImages;
  /** บรรทัดสรุปรูปร่าง เช่น "พิม · 165 ซม. · 54 กก. · Hourglass" */
  info: string;
}

/** ช่องที่สินค้าครอบครองบนตัว — ใช้กันเลือกเสื้อ 2 ตัวพร้อมกัน ฯลฯ */
export type GarmentSlot = "top" | "bottom" | "full" | "accessory";

export const slotOf = (category?: string): GarmentSlot => {
  const value = category?.trim().toLowerCase() ?? "";
  if (value === "top") return "top";
  if (value === "bottom" || value === "skirt") return "bottom";
  if (value === "dress" || value === "set") return "full";
  return "accessory";
};

export const productPrice = (product: Product) => {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
};

export const formatBaht = (value: number) => `฿${value.toLocaleString("th-TH")}`;
