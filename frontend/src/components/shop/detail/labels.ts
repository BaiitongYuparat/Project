// Label ภาษาไทยที่ใช้ร่วมกันในหน้า ProductDetail
// คีย์ต้องตรงกับ enum ใน Prisma schema / ค่า category ที่ shop admin บันทึกลง DB

const categoryLabelMap: Record<string, string> = {
  top: "เสื้อ",
  bottom: "กางเกง",
  dress: "เดรส",
  skirt: "กระโปรง",
  set: "ชุด",
  accessories: "เครื่องประดับ",
};

export const categoryLabel = (value: string) =>
  categoryLabelMap[value?.toLowerCase()] ?? value;

const genderLabelMap: Record<string, string> = {
  MALE: "ชาย",
  FEMALE: "หญิง",
  UNISEX: "Unisex",
};

export const genderLabel = (value?: string | null) =>
  (value && genderLabelMap[value]) || "Unisex";

const viewLabelMap: Record<string, string> = {
  FRONT: "ด้านหน้า",
  BACK: "ด้านหลัง",
  LEFT: "ด้านซ้าย",
  RIGHT: "ด้านขวา",
};

export const viewLabel = (value?: string | null) =>
  (value && viewLabelMap[value]) || null;

const pieceLabelMap: Record<string, string> = {
  SET: "ทั้งชุด",
  TOP: "ท่อนบน",
  BOTTOM: "ท่อนล่าง",
};

export const pieceLabel = (value?: string | null) =>
  (value && pieceLabelMap[value]) || null;
