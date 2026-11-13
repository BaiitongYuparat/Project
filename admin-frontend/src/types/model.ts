export type Gender = "MALE" | "FEMALE";

/** สล็อตรูปโมเดล 4 มุม — image_front บังคับ */
export type ImageSlot = "image_front" | "image_back" | "image_left" | "image_right";

export type Model = {
  id: string;
  name: string;
  gender: Gender | null;
  /** รอบอก (ซม.) */
  bust: number | null;
  /** รอบเอว (ซม.) */
  waist: number | null;
  /** รอบสะโพก (ซม.) */
  hips: number | null;
  /** ส่วนสูง (ซม.) */
  height: number | null;
  image_front: string;
  image_back: string | null;
  image_left: string | null;
  image_right: string | null;
  supported_sizes: string[];
  is_active: boolean;
  is_selectable: boolean;
  created_at: string;
};

/** ค่าที่กรอกในฟอร์ม (ยังเป็น string ทั้งหมด เพราะมาจาก input) */
export type ModelFormData = {
  name: string;
  gender: Gender | "";
  bust: string;
  waist: string;
  hips: string;
  height: string;
  supported_sizes: string[];
  is_selectable: boolean;
  /** ไฟล์รูปใหม่แยกตามมุม (โหมดสร้างต้องมี image_front) */
  images: Partial<Record<ImageSlot, File>>;
  /** มุมที่ผู้ใช้ล้าง (โหมดแก้ไข — ส่งให้ backend เคลียร์รูปเก่า) */
  removedImages: ImageSlot[];
};

export type ModelStatusPayload = {
  is_active?: boolean;
  is_selectable?: boolean;
};
