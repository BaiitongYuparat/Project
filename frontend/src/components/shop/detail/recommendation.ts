import type { Product } from "../../../services/productService";

// ปรับค่าหมวดหมู่ที่เก็บใน DB ให้เทียบกันได้ เช่น "accessory" = "accessories"
const normalizeCategory = (category?: string | null) => {
  const value = category?.trim().toLowerCase() ?? "";

  return value === "accessory" ? "accessories" : value;
};

interface PickRecommendedProductsArgs {
  /** สินค้าทั้งหมดที่ดึงมาจาก API (เรียงใหม่สุดมาก่อนแล้ว) */
  all: Product[];
  /** สินค้าที่กำลังเปิดดูอยู่ — ต้องไม่ถูกแนะนำซ้ำ */
  currentId: string;
  brandId?: string | null;
  category?: string | null;
  /** จำนวนสูงสุดที่ต้องการ (default 6 — พอดีหนึ่งแถวบนจอใหญ่) */
  limit?: number;
}

/**
 * เลือกสินค้าแนะนำแบบไม่ต้องพึ่ง backend:
 * 1) สินค้าร้านเดียวกัน → 2) สินค้าหมวดเดียวกัน/ใกล้เคียง → 3) เติมที่เหลือจนครบ limit
 * ลำดับภายในแต่ละกลุ่มคงตามที่ API ส่งมา (ใหม่สุดก่อน) และไม่มีสินค้าซ้ำ
 */
export const pickRecommendedProducts = ({
  all,
  currentId,
  brandId,
  category,
  limit = 6,
}: PickRecommendedProductsArgs): Product[] => {
  const picked: Product[] = [];
  const seen = new Set<string>([currentId]);

  const push = (product: Product) => {
    if (picked.length >= limit || seen.has(product.id)) return;

    seen.add(product.id);
    picked.push(product);
  };

  if (brandId) {
    all.filter((product) => product.brand_id === brandId).forEach(push);
  }

  const targetCategory = normalizeCategory(category);

  if (targetCategory) {
    all
      .filter((product) => normalizeCategory(product.category) === targetCategory)
      .forEach(push);
  }

  all.forEach(push);

  return picked;
};
