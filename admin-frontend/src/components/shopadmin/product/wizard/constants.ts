// ค่าคงที่ที่ใช้ร่วมกันใน wizard สร้าง/แก้สินค้า

export const CATEGORY_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "set", label: "Set (ชุด)" },
  { value: "accessories", label: "Accessories" },
];

export const GENDER_OPTIONS: { value: "UNISEX" | "MALE" | "FEMALE"; label: string }[] = [
  { value: "UNISEX", label: "ทุกเพศ (Unisex)" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

export const SIZE_MEASURE_COLUMNS: {
  field: "chest" | "waist" | "hips" | "length";
  label: string;
}[] = [
  { field: "chest", label: "รอบอก (ซม.)" },
  { field: "waist", label: "รอบเอว (ซม.)" },
  { field: "hips", label: "รอบสะโพก (ซม.)" },
  { field: "length", label: "ความยาว (ซม.)" },
];

// หมวดหมู่ที่ต้องมีตารางไซส์
export const requiresSizeChart = (category: string) =>
  category !== "" && category !== "accessories";

// หมวดที่ตารางไซส์รองรับ (สำหรับตารางกลางของร้าน)
export const CHART_CATEGORIES = ["top", "bottom", "dress"] as const;
