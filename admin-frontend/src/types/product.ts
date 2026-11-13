export type ImageView = "FRONT" | "BACK" | "LEFT" | "RIGHT";

export type ProductGender = "UNISEX" | "MALE" | "FEMALE";

// ชนิดรูปของสินค้าแบบชุด (เช่น set): SET = รูปรวมทั้งชุด (รูปหลัก)
export type ProductPiece = "SET" | "TOP" | "BOTTOM";

export type QualityStatus = "PENDING" | "PASSED" | "FAILED";

export interface ProductImage {
  id: string;
  color_id: string | null;
  s3_key: string;
  image_url: string;
  sort_order: number;
  quality_status: QualityStatus;
  quality_reason?: string | null;
  view: ImageView;
  piece?: ProductPiece | null;
  // FAILED เพราะระบบตรวจล้มเหลว (AI error / ปิดบริการ) ไม่ใช่รูปไม่ผ่านจริง
  quality_error?: boolean;
}

export interface ProductColor {
  id: string;
  name: string;
  hex: string | null;
  images: ProductImage[];
}

export interface ProductSizeChartRow {
  size: string;
  chest: number | string | null;
  waist: number | string | null;
  hips: number | string | null;
  length: number | string | null;
}

// ---------- ตารางไซส์กลางของร้าน ----------

export interface BrandSizeChartEntryRow {
  id: string;
  size: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  length: number | null;
  sort_order: number;
}

export interface BrandSizeChartEntry {
  id: string;
  category: string;
  rows: BrandSizeChartEntryRow[];
}

// ตารางที่ product อ้างอิง (resolved จาก API)
export interface ReferencedSizeChart {
  id: string;
  name: string;
  gender: ProductGender;
  // Free Size = ไซส์เดียว (แต่ละ entry มี 0–1 แถว, size = FREESIZE)
  is_freesize?: boolean;
  entries: BrandSizeChartEntry[];
}

export interface BrandSizeChart extends ReferencedSizeChart {
  brand_id: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

// ฟอร์มของหน้าสร้าง/แก้ไขตารางไซส์
export interface SizeChartEntryForm {
  category: string;
  rows: SizeChartRowForm[];
}

export interface SizeChartForm {
  name: string;
  gender: ProductGender;
  // Free Size = ไซส์เดียว (ใช้ได้กับทุกหมวด)
  is_freesize: boolean;
  entries: SizeChartEntryForm[];
}

export interface SizeChartTemplateRow {
  id: string;
  size: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  length: number | null;
  sort_order: number;
}

export interface SizeChartTemplate {
  id: string;
  name: string;
  gender: ProductGender;
  category: string | null;
  rows: SizeChartTemplateRow[];
}

export interface ProductOptions {
  seasons: string[];
  occasions: string[];
}

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  category: string;
  gender: ProductGender;
  fabric: string | null;
  seasons: string[];
  occasions: string[];
  price: number | string | null;
  description: string | null;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  colors: ProductColor[];
  size_chart_id: string | null;
  size_chart: ReferencedSizeChart | null;
  size_charts: ProductSizeChartRow[];
}

// ข้อมูลย่อของสินค้าสำหรับหน้า list — list API ไม่ส่งตารางไซส์และรูปต่อสี (ดึงเต็มใช้ getProductById)
export interface ProductSummaryColor {
  id: string;
  name: string;
  hex: string | null;
}

export type ProductSummary = Omit<
  Product,
  "colors" | "size_chart_id" | "size_chart" | "size_charts"
> & {
  colors: ProductSummaryColor[];
};

// ---------- ฟอร์ม (state ฝั่ง UI) ----------

export interface ProductImageForm {
  file: File;
  view: ImageView;
  // ชนิดรูป (ใช้กับสินค้าแบบชุด เช่น set)
  piece?: ProductPiece | null;
}

// สีในฟอร์ม — id = null คือสีใหม่, legacy = กลุ่มรูปเดิมที่ยังไม่มีสี
export interface ProductColorForm {
  id: string | null;
  name: string;
  hex: string;
  existing_images: ProductImage[];
  new_images: ProductImageForm[];
  removed_image_ids: string[];
  legacy?: boolean;
}

export interface SizeChartRowForm {
  size: string;
  chest: string;
  waist: string;
  hips: string;
  length: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  gender: ProductGender;
  fabric: string;
  seasons: string[];
  occasions: string[];
  price: string;
  description: string;
  sku: string;
  is_active: boolean;
  // อ้างอิงตารางกลางของร้าน (null = โหมดตารางเฉพาะตัว/สร้างเอง)
  size_chart_id: string | null;
  // rows โหมดตารางเฉพาะตัว (ใช้เมื่อ size_chart_id = null)
  size_chart: SizeChartRowForm[];
  colors: ProductColorForm[];
}

// draft ที่เก็บลง sessionStorage ตอนออกจากฟอร์มสินค้ากลางคัน (กู้ตอนกลับมา)
export interface ProductFormDraft {
  form: ProductFormData;
  remove_color_ids: string[];
  editing_product_id: string | null;
  // step ของ wizard ตอนเซฟ (กู้กลับไป step เดิม)
  step?: number;
}

// Payload ที่ส่งให้ service
export interface ProductSubmitPayload {
  form: ProductFormData;
  remove_color_ids: string[];
}