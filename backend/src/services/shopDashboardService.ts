import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getImageUrl } from "../utils/s3Utils";

// Dashboard ของร้าน (Shop Admin) — สถิติ Virtual Try-On เฉพาะร้านตัวเอง
// นับเฉพาะการ gen จริง ไม่นับผลที่คืนจาก cache (เงื่อนไขเดียวกับ quota ใน tryOnService)
// และใช้เขตเวลาไทย (UTC+7) ในการตัดขอบเขตวัน/สร้างกราฟรายวัน

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const SHOP_DASHBOARD_DAYS = [7, 30, 90] as const;
export type ShopDashboardDays = (typeof SHOP_DASHBOARD_DAYS)[number];

// ต้นวันตามเวลาไทย (คืนค่าเป็น Date แบบ UTC เพื่อใช้ query กับคอลัมน์ timestamp)
const startOfLocalDay = (offsetDays: number) => {
  const local = new Date(Date.now() + TZ_OFFSET_MS + offsetDays * DAY_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS);
};

// "YYYY-MM-DD" ของวันตามเวลาไทย
const localDateKey = (utc: Date) =>
  new Date(utc.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

const TOP_PRODUCT_LIMIT = 5;
// จำนวนแท่งในกราฟ category — แสดงหมวดที่มีคนลองมากที่สุด
const CATEGORY_LIMIT = 8;

// เปอร์เซ็นต์เปลี่ยนแปลงเทียบช่วงก่อนหน้า (null = ไม่มีข้อมูลให้เทียบ)
const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

export type ShopDashboard = {
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: {
    tryons: { value: number; change: number | null };
    users: { value: number; change: number | null };
    activeProducts: number;
  };
  series: { date: string; count: number }[];
  topProducts: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
    count: number;
  }[];
  categories: { category: string; count: number }[];
};

export const getShopDashboard = async (
  brandId: string,
  days: ShopDashboardDays = 30
): Promise<ShopDashboard> => {
  // ช่วงปัจจุบัน: {days} วันล่าสุดรวมวันนี้ / ช่วงก่อนหน้า: ยาวเท่ากันก่อนหน้าถัดไป
  const startUtc = startOfLocalDay(-(days - 1));
  const endUtc = startOfLocalDay(1);
  const prevStartUtc = startOfLocalDay(-(days * 2 - 1));
  const prevEndUtc = startUtc;

  const realGeneration = {
    OR: [{ provider: null }, { provider: { not: "cache" } }],
  };

  const currentWhere = {
    brand_id: brandId,
    created_at: { gte: startUtc, lt: endUtc },
    ...realGeneration,
  };
  const previousWhere = {
    brand_id: brandId,
    created_at: { gte: prevStartUtc, lt: prevEndUtc },
    ...realGeneration,
  };

  const [
    tryons,
    prevTryons,
    users,
    prevUsers,
    activeProducts,
    grouped,
    topGrouped,
    categoryRows,
  ] = await Promise.all([
    prisma.tryOnLog.count({ where: currentWhere }),
    prisma.tryOnLog.count({ where: previousWhere }),
    prisma.tryOnLog.findMany({
      where: { ...currentWhere, user_id: { not: null } },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
    prisma.tryOnLog.findMany({
      where: { ...previousWhere, user_id: { not: null } },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
    prisma.product.count({ where: { brand_id: brandId, is_active: true } }),
    // กราฟรายวัน — รวมยอดต่อวันตามเวลาไทย
    prisma.$queryRaw<{ bucket: string; count: number }[]>(Prisma.sql`
      SELECT
        to_char(date_trunc('day', created_at + interval '7 hours'), 'YYYY-MM-DD') AS bucket,
        COUNT(*)::int AS count
      FROM try_on_logs
      WHERE brand_id = ${brandId}
        AND created_at >= ${startUtc} AND created_at < ${endUtc}
        AND (provider IS NULL OR provider <> 'cache')
      GROUP BY 1
      ORDER BY 1
    `),
    // สินค้าที่ถูกลองมากที่สุด (นับจาก product_id ของ log)
    prisma.tryOnLog.groupBy({
      by: ["product_id"],
      where: { ...currentWhere, product_id: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { product_id: "desc" } },
      take: TOP_PRODUCT_LIMIT,
    }),
    // ความนิยมตามหมวดหมู่สินค้า
    prisma.$queryRaw<{ category: string; count: number }[]>(Prisma.sql`
      SELECT p.category AS category, COUNT(*)::int AS count
      FROM try_on_logs t
      JOIN products p ON p.id = t.product_id
      WHERE t.brand_id = ${brandId}
        AND t.created_at >= ${startUtc} AND t.created_at < ${endUtc}
        AND (t.provider IS NULL OR t.provider <> 'cache')
        AND p.category IS NOT NULL AND p.category <> ''
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT ${CATEGORY_LIMIT}
    `),
  ]);

  // เติมวันที่ไม่มีการใช้งานให้เป็น 0 เพื่อให้เส้นกราฟต่อเนื่อง
  const countByDate = new Map(grouped.map((row) => [row.bucket, Number(row.count)]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = localDateKey(startOfLocalDay(index - (days - 1)));
    return { date, count: countByDate.get(date) ?? 0 };
  });

  const topIds = topGrouped
    .map((row) => row.product_id)
    .filter((id): id is string => Boolean(id));

  const products = topIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topIds } },
        select: {
          id: true,
          name: true,
          category: true,
          images: {
            select: { s3_key: true },
            orderBy: [{ sort_order: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
      })
    : [];

  const productById = new Map(products.map((product) => [product.id, product]));

  const topProducts = await Promise.all(
    topIds.flatMap((id) => {
      const product = productById.get(id);
      if (!product) return [];
      const count =
        topGrouped.find((row) => row.product_id === id)?._count._all ?? 0;
      const cover = product.images[0]?.s3_key;

      return [
        (async () => ({
          id: product.id,
          name: product.name,
          category: product.category,
          image_url: cover ? await getImageUrl(cover).catch(() => null) : null,
          count: Number(count),
        }))(),
      ];
    })
  );

  return {
    range: {
      days,
      from: localDateKey(startUtc),
      to: localDateKey(startOfLocalDay(0)),
    },
    totals: {
      tryons: { value: tryons, change: percentChange(tryons, prevTryons) },
      users: { value: users.length, change: percentChange(users.length, prevUsers.length) },
      activeProducts,
    },
    series,
    topProducts,
    categories: categoryRows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    })),
  };
};
