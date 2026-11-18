import api from "../api";
import {
  cachedQuery,
  invalidate,
} from "../cache";
import type {
  BrandSizeChart,
  ProductGender,
  SizeChartForm,
} from "../../types/product";

// รายการตารางไซส์ — stale-while-revalidate 30 วิ
const CHARTS_TTL_MS = 30_000;

const chartsKey = (slug: string) => `charts:${slug}`;

// ---------- ตารางไซส์กลางของร้าน ----------

// ดึงตารางไซส์ทั้งหมดของร้าน (cache 30 วิ — stale-while-revalidate)
export const getBrandSizeCharts = (
  slug: string,
  opts: { force?: boolean } = {},
): Promise<BrandSizeChart[]> =>
  cachedQuery(
    chartsKey(slug),
    async () => {
      const response = await api.get(`/brands/${slug}/size-charts`);

      return response.data.charts as BrandSizeChart[];
    },
    CHARTS_TTL_MS,
    opts,
  );

// หลัง mutation ตารางไซส์ (หรือ product_count เปลี่ยน) — mark stale ให้หน้า list โหลดใหม่
export const invalidateCharts = (slug: string) =>
  invalidate(chartsKey(slug), { keepStale: true });

// ดึงตารางไซส์ 1 รายการ (ไม่ cache — ฟอร์มแก้ไขต้องได้ข้อมูลสด)
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
  is_freesize: form.is_freesize === true,
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
  const response = await api.post(`/brands/${slug}/size-charts`, toPayload(form));

  invalidateCharts(slug);

  return response;
};

// แก้ไขตารางไซส์
export const updateBrandSizeChart = async (
  slug: string,
  chartId: string,
  form: SizeChartForm
) => {
  const response = await api.put(
    `/brands/${slug}/size-charts/${chartId}`,
    toPayload(form),
  );

  invalidateCharts(slug);

  return response;
};

// ลบตารางไซส์ (block ถ้ามีสินค้าใช้อ้างอิง)
export const deleteBrandSizeChart = async (
  slug: string,
  chartId: string
) => {
  const response = await api.delete(`/brands/${slug}/size-charts/${chartId}`);

  invalidateCharts(slug);

  return response;
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

// helper: ตารางมี entry ของหมวดนั้น (พร้อมแถว) หรือไม่
const chartHasCategory = (chart: BrandSizeChart, category: string) =>
  chart.entries.some(
    (entry) => entry.category === category && entry.rows.length > 0,
  );

// set = สินค้า 1 ชุด → ตารางต้องมี entry ครบทั้งท่อนบน (top) และท่อนล่าง (bottom)
// freesize = แถวอาจว่าง (0 แถว) ได้ — ขอแค่ entry มีอยู่
export const chartMatchesCategory = (chart: BrandSizeChart, category: string) => {
  const hasCategory = (cat: string) =>
    chart.entries.some((entry) => entry.category === cat);

  if (category === "set") {
    return chart.is_freesize
      ? hasCategory("top") && hasCategory("bottom")
      : hasCategory("top") &&
          hasCategory("bottom") &&
          chartHasCategory(chart, "top") &&
          chartHasCategory(chart, "bottom");
  }

  return chart.is_freesize
    ? hasCategory(category)
    : chartHasCategory(chart, category);
};

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

    if (category && chartMatchesCategory(chart, category)) {
      value += 4;
    }

    return value;
  };

  return [...charts].sort(
    (a, b) => score(b) - score(a) || a.name.localeCompare(b.name),
  );
};
