import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

const CATEGORIES = ["top", "bottom", "dress"] as const;
type Category = (typeof CATEGORIES)[number];

interface EntryRowInput {
  size: string;
  chest?: number | string | null;
  waist?: number | string | null;
  hips?: number | string | null;
  length?: number | string | null;
}

interface EntryInput {
  category: string;
  rows: EntryRowInput[];
}

export interface SizeChartPayload {
  name: string;
  gender?: "UNISEX" | "MALE" | "FEMALE";
  // ตารางไซส์เดียว (Free Size) — ใช้ได้กับทุกหมวด แต่ละ entry มี 0–1 แถวได้
  is_freesize?: boolean;
  entries: EntryInput[];
}

const toDecimal = (value: unknown): Prisma.Decimal | null => {
  if (value === undefined || value === null || value === "") return null;

  const num = Number(value);

  return Number.isFinite(num) ? new Prisma.Decimal(num) : null;
};

const rowsData = (rows: EntryRowInput[]) =>
  rows
    .filter((row) => typeof row.size === "string" && row.size.trim())
    .map((row, index) => ({
      size: row.size.trim(),
      chest: toDecimal(row.chest),
      waist: toDecimal(row.waist),
      hips: toDecimal(row.hips),
      length: toDecimal(row.length),
      sort_order: index,
    }));

const chartInclude = {
  entries: {
    orderBy: { category: "asc" as const },
    include: {
      rows: {
        orderBy: { sort_order: "asc" as const },
      },
    },
  },
};

// ตารางไซส์ทั้งหมดของร้าน + จำนวนสินค้าที่อ้างอิง
export const getBrandSizeCharts = async (brandId: string) => {
  const charts = await prisma.brandSizeChart.findMany({
    where: { brand_id: brandId },
    orderBy: { created_at: "desc" },
    include: {
      ...chartInclude,
      _count: {
        select: { products: true },
      },
    },
  });

  return charts.map(({ _count, ...chart }) => ({
    ...chart,
    product_count: _count.products,
  }));
};

// ตารางไซส์ 1 รายการ
export const getBrandSizeChartById = async (
  brandId: string,
  chartId: string
) => {
  return await prisma.brandSizeChart.findFirst({
    where: { id: chartId, brand_id: brandId },
    include: chartInclude,
  });
};

// สร้างตารางไซส์
export const createBrandSizeChart = async (
  brandId: string,
  payload: SizeChartPayload
) => {
  const duplicate = await prisma.brandSizeChart.findFirst({
    where: { brand_id: brandId, name: payload.name.trim() },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("SIZE_CHART_NAME_DUPLICATE");
  }

  return await prisma.brandSizeChart.create({
    data: {
      brand_id: brandId,
      name: payload.name.trim(),
      gender: payload.gender ?? "UNISEX",
      is_freesize: payload.is_freesize ?? false,
      entries: {
        create: payload.entries.map((entry) => ({
          category: entry.category,
          rows: {
            create: rowsData(entry.rows),
          },
        })),
      },
    },
    include: chartInclude,
  });
};

// แก้ไขตารางไซส์ (replace entries ทั้งก้อน)
export const updateBrandSizeChart = async (
  brandId: string,
  chartId: string,
  payload: SizeChartPayload
) => {
  const duplicate = await prisma.brandSizeChart.findFirst({
    where: {
      brand_id: brandId,
      name: payload.name.trim(),
      id: { not: chartId },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("SIZE_CHART_NAME_DUPLICATE");
  }

  const existing = await prisma.brandSizeChart.findFirst({
    where: { id: chartId, brand_id: brandId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return await prisma.$transaction(
    async (tx) => {
      await tx.brandSizeChartEntry.deleteMany({
        where: { chart_id: chartId },
      });

      return tx.brandSizeChart.update({
        where: { id: chartId },
        data: {
          name: payload.name.trim(),
          gender: payload.gender ?? "UNISEX",
          is_freesize: payload.is_freesize ?? false,
          entries: {
            create: payload.entries.map((entry) => ({
              category: entry.category,
              rows: {
                create: rowsData(entry.rows),
              },
            })),
          },
        },
        include: chartInclude,
      });
    },
    { timeout: 20000, maxWait: 5000 }
  );
};

// ลบตารางไซส์ — ห้ามลบถ้ามีสินค้าอ้างอิงอยู่
export const deleteBrandSizeChart = async (
  brandId: string,
  chartId: string
) => {
  const existing = await prisma.brandSizeChart.findFirst({
    where: { id: chartId, brand_id: brandId },
    select: {
      id: true,
      _count: {
        select: { products: true },
      },
    },
  });

  if (!existing) {
    return null;
  }

  if (existing._count.products > 0) {
    throw new Error("SIZE_CHART_IN_USE");
  }

  await prisma.brandSizeChart.delete({ where: { id: chartId } });

  return { id: chartId };
};

// ตรวจว่าตารางเป็นของร้านและมีข้อมูลของ category สินค้าจริง
// คืน rows ของ category นั้น (ใช้ตอน product อ้างอิงตาราง)
export const resolveSizeChartForProduct = async (
  brandId: string,
  chartId: string,
  category: string
) => {
  const chart = await prisma.brandSizeChart.findFirst({
    where: { id: chartId, brand_id: brandId },
    include: {
      entries: {
        where: { category },
        include: {
          rows: {
            orderBy: { sort_order: "asc" },
          },
        },
      },
    },
  });

  if (!chart) {
    return { error: "SIZE_CHART_NOT_FOUND" as const };
  }

  // set = สินค้า 1 ชุด → ตารางต้องมี entry ทั้งท่อนบน (top) และท่อนล่าง (bottom)
  if (category === "set") {
    const entries = await prisma.brandSizeChartEntry.findMany({
      where: { chart_id: chartId, category: { in: ["top", "bottom"] } },
      include: {
        rows: {
          orderBy: { sort_order: "asc" },
        },
      },
    });

    const top = entries.find((entry) => entry.category === "top");
    const bottom = entries.find((entry) => entry.category === "bottom");

    // freesize = ไซส์เดียว แถวอาจว่าง (0 แถว) ได้ — ขอแค่ entry มีอยู่ครบทั้งคู่
    if (
      chart.is_freesize
        ? !top || !bottom
        : !top?.rows.length || !bottom?.rows.length
    ) {
      return { error: "SIZE_CHART_CATEGORY_MISSING" as const };
    }

    return {
      rows: [...(top?.rows ?? []), ...(bottom?.rows ?? [])],
      chartName: chart.name,
    };
  }

  const entry = chart.entries[0];

  if (!entry || (chart.is_freesize ? false : entry.rows.length === 0)) {
    return { error: "SIZE_CHART_CATEGORY_MISSING" as const };
  }

  return {
    rows: entry.rows,
    chartName: chart.name,
  };
};
