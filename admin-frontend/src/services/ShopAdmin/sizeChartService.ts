import api from "../api";
import type {
  BrandSizeChart,
  ProductGender,
  SizeChartForm,
} from "../../types/product";

// ---------- ตารางไซส์กลางของร้าน ----------

// ดึงตารางไซส์ทั้งหมดของร้าน
export const getBrandSizeCharts = async (
  slug: string
): Promise<BrandSizeChart[]> => {
  const response = await api.get(`/brands/${slug}/size-charts`);

  return response.data.charts;
};

// ดึงตารางไซส์ 1 รายการ
export const getBrandSizeChartById = async (
  slug: string,
  chartId: string
): Promise<BrandSizeChart> => {
  const response = await api.get(`/brands/${slug}/size-charts/${chartId}`);

  return response.data.chart;
};

const toPayload = (form: SizeChartForm) => ({
  name: form.name,
  gender: form.gender,
  entries: form.entries.map((entry) => ({
    category: entry.category,
    rows: entry.rows.map((row) => ({
      size: row.size,
      chest: row.chest === "" ? null : row.chest,
      waist: row.waist === "" ? null : row.waist,
      hips: row.hips === "" ? null : row.hips,
      length: row.length === "" ? null : row.length,
    })),
  })),
});

// สร้างตารางไซส์
export const createBrandSizeChart = async (
  slug: string,
  form: SizeChartForm
) => {
  return api.post(`/brands/${slug}/size-charts`, toPayload(form));
};

// แก้ไขตารางไซส์
export const updateBrandSizeChart = async (
  slug: string,
  chartId: string,
  form: SizeChartForm
) => {
  return api.put(`/brands/${slug}/size-charts/${chartId}`, toPayload(form));
};

// ลบตารางไซส์ (block ถ้ามีสินค้าใช้อ้างอิง)
export const deleteBrandSizeChart = async (
  slug: string,
  chartId: string
) => {
  return api.delete(`/brands/${slug}/size-charts/${chartId}`);
};

// helper: แปลง rows ของ entry เป็น rows สำหรับฟอร์ม
export const entryRowsToFormRows = (
  rows: BrandSizeChart["entries"][number]["rows"]
) =>
  rows.map((row) => ({
    size: row.size,
    chest: row.chest === null ? "" : String(row.chest),
    waist: row.waist === null ? "" : String(row.waist),
    hips: row.hips === null ? "" : String(row.hips),
    length: row.length === null ? "" : String(row.length),
  }));

// helper: เรียงตารางให้ตัวที่ตรงเพศ/category ขึ้นก่อน (ตัวช่วยกรอง ไม่ใช่ข้อบังคับ)
export const sortChartsForProduct = (
  charts: BrandSizeChart[],
  gender: ProductGender,
  category: string
) => {
  const score = (chart: BrandSizeChart) => {
    let value = 0;

    if (chart.gender === gender) value += 2;
    else if (chart.gender === "UNISEX") value += 1;

    if (
      category &&
      chart.entries.some(
        (entry) => entry.category === category && entry.rows.length > 0,
      )
    ) {
      value += 4;
    }

    return value;
  };

  return [...charts].sort(
    (a, b) => score(b) - score(a) || a.name.localeCompare(b.name),
  );
};
