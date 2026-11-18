// ตัวช่วยเรื่องสินค้า/ช่องเสื้อผ้า — ใช้ร่วมกันหลายหน้า (Home, Product Detail, Try-On)

export const CATEGORY_ORDER = [
  "top",
  "bottom",
  "dress",
  "skirt",
  "set",
  "accessories",
];

const CATEGORY_LABELS: Record<string, string> = {
  top: "เสื้อ",
  bottom: "กางเกง",
  dress: "เดรส",
  skirt: "กระโปรง",
  set: "ชุด",
  accessories: "กระเป๋า",
  accessory: "กระเป๋า",
};

export const categoryLabel = (value?: string | null) =>
  (value && CATEGORY_LABELS[value]) ?? value ?? "";

// ปรับค่าที่เก็บใน DB ให้เทียบกันได้ เช่น "accessory" = "accessories"
export const normalizeCategory = (category?: string | null) => {
  const value = category?.trim().toLowerCase() ?? "";
  return value === "accessory" ? "accessories" : value;
};

export const genderLabel = (gender?: string | null) =>
  gender === "MALE" ? "ผู้ชาย" : gender === "FEMALE" ? "ผู้หญิง" : "หญิง/ชาย";

export const productPrice = (product: { price?: number | string | null }) => {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
};

export const formatBaht = (value: number) =>
  `฿${value.toLocaleString("th-TH")}`;

export const formatPrice = (price?: number | string | null) => {
  const value = Number(price);
  return Number.isFinite(value) ? formatBaht(value) : "ราคาไม่ระบุ";
};

export type GarmentSlot = "top" | "bottom" | "full" | "accessory";

/** ช่องที่สินค้าครอบครองบนตัว — ใช้กันเลือกเสื้อ 2 ตัวพร้อมกัน ฯลฯ */
export const slotOf = (category?: string | null): GarmentSlot => {
  const value = normalizeCategory(category);
  if (value === "top") return "top";
  if (value === "bottom" || value === "skirt") return "bottom";
  if (value === "dress" || value === "set") return "full";
  return "accessory";
};

/** ช่องที่ชนกัน: เลือกเดรส/ชุด จะเอาเสื้อ+กางเกงออก และกลับกัน */
export const SLOT_CONFLICTS: Record<GarmentSlot, GarmentSlot[]> = {
  top: ["top", "full"],
  bottom: ["bottom", "full"],
  full: ["top", "bottom", "full"],
  accessory: [],
};

const VIEW_LABELS: Record<string, string> = {
  FRONT: "ด้านหน้า",
  BACK: "ด้านหลัง",
  LEFT: "ด้านซ้าย",
  RIGHT: "ด้านขวา",
};

export const viewLabel = (value?: string | null) =>
  (value && VIEW_LABELS[value]) || null;

const PIECE_LABELS: Record<string, string> = {
  SET: "ทั้งชุด",
  TOP: "ท่อนบน",
  BOTTOM: "ท่อนล่าง",
};

export const pieceLabel = (value?: string | null) =>
  (value && PIECE_LABELS[value]) || null;
