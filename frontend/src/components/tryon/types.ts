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

/** null = หมวดที่ไม่รองรับในหน้า try-on (ไม่แสดงในตัวเลือก) */
export const slotOf = (category?: string): GarmentSlot | null => {
  const value = category?.trim().toLowerCase() ?? "";
  if (value === "top") return "top";
  if (value === "bottom" || value === "skirt") return "bottom";
  if (value === "dress" || value === "set") return "full";
  if (value === "accessories" || value === "accessory") return "accessory";
  return null;
};

/** productId → colorId ที่ผู้ใช้เลือก (ไม่มี = ใช้สีแรก) */
export type ColorSelection = Record<string, string>;

/** สีที่ใช้ลองใส่ของสินค้านี้ — ที่เลือกไว้ หรือสีแรก; null = สินค้าไม่มีระบบสี */
export const colorOf = (product: Product, selection: ColorSelection): string | null => {
  const colors = product.colors ?? [];
  const chosen = selection[product.id];
  if (chosen && colors.some((c) => c.id === chosen)) return chosen;
  return colors[0]?.id ?? null;
};

/** รูปตัวอย่างของสินค้าตามสี — รูปหน้าของสีนั้น > รูปแรกของสีนั้น > รูปแรกของสินค้า */
export const garmentImage = (product: Product, colorId: string | null): string | null => {
  const images = colorId
    ? product.colors?.find((c) => c.id === colorId)?.images ?? []
    : [];
  const pick = images.find((i) => i.view === "FRONT") ?? images[0];
  return pick?.image_url ?? product.images?.[0]?.image_url ?? null;
};

export const productPrice = (product: Product) => {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
};

export const formatBaht = (value: number) => `฿${value.toLocaleString("th-TH")}`;

/** สินค้านี้มีรูปมุมที่เลือกหรือไม่ (ดูทั้งรูปรวมและรูปต่อสี) — รูปที่ไม่ระบุมุมนับเป็นด้านหน้า */
export const hasView = (product: Product, angle: Angle): boolean => {
  const view = angle.toUpperCase();
  const images = [...(product.images ?? []), ...(product.colors ?? []).flatMap((c) => c.images ?? [])];
  return images.some((i) => i.image_url && (i.view ?? "FRONT") === view);
};
