import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// สถิติภาพรวมแพลตฟอร์มสำหรับหน้า Dashboard ของ Super Admin
// ทุกตัวเลขฝั่งการใช้งาน (ผู้ใช้/คำขอ/กราฟ/อันดับร้าน) นับตามช่วงเวลาที่เลือก
// ส่วนจำนวนร้านค้าเป็นยอดรวมทั้งระบบ

export type DashboardRange = "day" | "week" | "month" | "year" | "custom";
export type DashboardBucket = "day" | "week" | "month" | "year";

// ไทยไม่มี DST จึงใช้ offset คงที่ได้
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

// แปลง UTC -> เวลาท้องถิ่น (สำหรับตัดขอบเขตวัน/สัปดาห์/เดือนแบบไทย)
const toLocal = (d: Date) => new Date(d.getTime() + TZ_OFFSET_MS);
// แปลงเวลาท้องถิ่น -> UTC (สำหรับ query ลง DB ที่เก็บเป็น UTC)
const toUtc = (d: Date) => new Date(d.getTime() - TZ_OFFSET_MS);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

// สัปดาห์เริ่มวันจันทร์ (ตรงกับ date_trunc('week') ของ Postgres)
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  const offset = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - offset);
  return x;
};

const startOfMonth = (d: Date) => {
  const x = startOfDay(d);
  x.setUTCDate(1);
  return x;
};

const startOfYear = (d: Date) => {
  const x = startOfMonth(d);
  x.setUTCMonth(0);
  return x;
};

const addUnit = (d: Date, unit: DashboardBucket, amount: number) => {
  const x = new Date(d);
  if (unit === "day") x.setUTCDate(x.getUTCDate() + amount);
  else if (unit === "week") x.setUTCDate(x.getUTCDate() + amount * 7);
  else if (unit === "month") x.setUTCMonth(x.getUTCMonth() + amount);
  else x.setUTCFullYear(x.getUTCFullYear() + amount);
  return x;
};

// ตัดต้นช่วงของ bucket ตามหน่วย
const bucketStart = (d: Date, unit: DashboardBucket) => {
  if (unit === "day") return startOfDay(d);
  if (unit === "week") return startOfWeek(d);
  if (unit === "month") return startOfMonth(d);
  return startOfYear(d);
};

// จำนวน bucket ย้อนหลังของแต่ละช่วง (รายวัน = 7 วัน, รายสัปดาห์ = 8 สัปดาห์ ฯลฯ)
const RANGE_CONFIG: Record<
  Exclude<DashboardRange, "custom">,
  { unit: DashboardBucket; count: number }
> = {
  day: { unit: "day", count: 7 },
  week: { unit: "week", count: 8 },
  month: { unit: "month", count: 12 },
  year: { unit: "year", count: 5 },
};

const MAX_CUSTOM_DAYS = 366;

type ResolvedRange = {
  startLocal: Date;
  endLocal: Date;
  /** ต้น bucket สุดท้าย (ใช้ตัดสินใจว่ามีกี่แท่งในกราฟ) */
  unit: DashboardBucket;
  /** ขอบบนแบบ exclusive ของช่วงที่ query */
  endBoundary: Date;
};

// คำนวณขอบเขตช่วงเวลา (คืนค่าเป็นเวลาไทย แล้วค่อยแปลงเป็น UTC ตอน query)
const resolveRange = (
  range: DashboardRange,
  from?: string | null,
  to?: string | null
): ResolvedRange => {
  const todayLocal = toLocal(new Date());

  if (range === "custom") {
    const parsedTo = to ? new Date(`${to}T00:00:00Z`) : null;
    const parsedFrom = from ? new Date(`${from}T00:00:00Z`) : null;

    const endLocal = startOfDay(
      parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : todayLocal
    );

    let startLocal = startOfDay(
      parsedFrom && !Number.isNaN(parsedFrom.getTime())
        ? parsedFrom
        : addUnit(endLocal, "day", -(MAX_CUSTOM_DAYS - 1))
    );

    // กันช่วงกลับด้าน และจำกัดความยาวไม่ให้กราฟแน่นเกินไป
    if (startLocal > endLocal) startLocal = endLocal;
    const maxStart = addUnit(endLocal, "day", -(MAX_CUSTOM_DAYS - 1));
    if (startLocal < maxStart) startLocal = maxStart;

    const spanDays =
      Math.round((endLocal.getTime() - startLocal.getTime()) / 86_400_000) + 1;

    return {
      startLocal,
      endLocal,
      unit: spanDays <= 62 ? "day" : "month",
      endBoundary: addUnit(endLocal, "day", 1),
    };
  }

  const { unit, count } = RANGE_CONFIG[range];
  const endLocal = bucketStart(todayLocal, unit);
  const startLocal = addUnit(endLocal, unit, -(count - 1));

  // ขอบบนของ bucket สุดท้าย (วันนี้ยังไม่จบ ยอดจึงเป็นของถึงเวลาปัจจุบัน)
  const endBoundary = addUnit(endLocal, unit, 1);

  return { startLocal, endLocal, unit, endBoundary };
};

const formatKey = (d: Date) => d.toISOString().slice(0, 10);

export type PlatformDashboard = {
  range: {
    from: string;
    to: string;
    unit: DashboardBucket;
  };
  totals: {
    brands: number;
    users: number;
    requests: number;
    failed: number;
    /** ต้นทุน AI รวม (USD) เฉพาะการ gen จริง */
    cost: number;
    /** ค่าเฉลี่ยเวลา gen ที่สำเร็จ (ms) — null ถ้าไม่มีข้อมูล */
    avgDurationMs: number | null;
    /** จำนวนครั้งที่คืนผลจากแคช (ไม่เสียค่า AI) */
    cacheHits: number;
  };
  /** ต้นทุนแยกตาม provider (fal / bfl) */
  byProvider: { provider: string; count: number; cost: number }[];
  /** งานที่รอ Super Admin จัดการ (ทั้งระบบ ไม่ขึ้นกับช่วงเวลา) */
  pending: {
    brands: number;
    appeals: number;
    ownerTransfers: number;
    aiReports: number;
  };
  series: {
    date: string;
    requests: number;
    success: number;
    cost: number;
  }[];
  topBrands: {
    id: string;
    brand_name: string;
    count: number;
  }[];
  brands: {
    id: string;
    brand_name: string;
    owner_name: string;
    email: string | null;
    status: string;
    products: number;
    tryons: number;
    cost: number;
  }[];
};

export const getPlatformDashboard = async (
  range: DashboardRange = "day",
  from?: string | null,
  to?: string | null
): Promise<PlatformDashboard> => {
  const resolved = resolveRange(range, from, to);
  const unit = resolved.unit;

  // ขอบเขตจริงที่ใช้ query — ต้นช่วงคือต้น bucket แรก, ปลายช่วงคือปลาย bucket สุดท้าย
  const startUtc = toUtc(resolved.startLocal);
  const endUtc = toUtc(resolved.endBoundary);

  // นับเฉพาะการ gen จริง — ไม่นับผลที่คืนจาก cache (แถวที่ provider = "cache" ถูกสร้างตอน cache hit)
  // ต้องเขียนแบบ OR เพราะ `provider != 'cache'` จะตัดแถวที่ provider เป็น NULL (FAILED) ออกไปด้วย
  // เงื่อนไขเดียวกับที่ใช้คุมโควตารายวันใน tryOnService
  const where = {
    created_at: { gte: startUtc, lt: endUtc },
    OR: [{ provider: null }, { provider: { not: "cache" } }],
  };

  const [
    brands,
    brandCount,
    requests,
    success,
    failed,
    distinctUsers,
    perBrand,
    costAgg,
    durationAgg,
    cacheHits,
    perProvider,
    pendingBrands,
    pendingAppeals,
    pendingTransfers,
    pendingReports,
  ] = await Promise.all([
      prisma.brand.findMany({
        select: {
          id: true,
          brand_name: true,
          owner_name: true,
          email: true,
          status: true,
          _count: { select: { products: true } },
        },
      }),
      prisma.brand.count(),
      prisma.tryOnLog.count({ where }),
      prisma.tryOnLog.count({ where: { ...where, status: "SUCCESS" } }),
      prisma.tryOnLog.count({ where: { ...where, status: "FAILED" } }),
      prisma.tryOnLog.findMany({
        where: { ...where, user_id: { not: null } },
        distinct: ["user_id"],
        select: { user_id: true },
      }),
      prisma.tryOnLog.groupBy({
        by: ["brand_id"],
        where,
        _count: { _all: true },
        _sum: { cost: true },
      }),
      prisma.tryOnLog.aggregate({ where, _sum: { cost: true } }),
      prisma.tryOnLog.aggregate({
        where: { ...where, status: "SUCCESS", duration_ms: { not: null } },
        _avg: { duration_ms: true },
      }),
      prisma.tryOnLog.count({
        where: {
          created_at: { gte: startUtc, lt: endUtc },
          provider: "cache",
        },
      }),
      prisma.tryOnLog.groupBy({
        by: ["provider"],
        where: { ...where, provider: { not: null } },
        _count: { _all: true },
        _sum: { cost: true },
      }),
      prisma.brand.count({ where: { status: "PENDING" } }),
      prisma.appeal.count({ where: { status: "PENDING" } }),
      prisma.ownerTransferRequest.count({ where: { status: "PENDING" } }),
      prisma.aiReport.count({ where: { status: "PENDING" } }),
    ]);

  // กราฟ: รวมยอดต่อ bucket ในเขตเวลาไทย (created_at เก็บเป็น UTC แบบไม่มี tz)
  const rows = await prisma.$queryRaw<
    { bucket: string; requests: number; success: number; cost: number }[]
  >(Prisma.sql`
    SELECT
      to_char(date_trunc(${unit}::text, created_at + interval '7 hours'), 'YYYY-MM-DD') AS bucket,
      COUNT(*)::int AS requests,
      COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS success,
      COALESCE(SUM(cost), 0)::float8 AS cost
    FROM try_on_logs
    WHERE created_at >= ${startUtc} AND created_at < ${endUtc}
      AND (provider IS NULL OR provider <> 'cache')
    GROUP BY 1
    ORDER BY 1
  `);

  const byBucket = new Map(rows.map((r) => [r.bucket, r]));

  // เติม bucket ที่ไม่มีข้อมูลให้เป็น 0 เพื่อให้กราฟต่อเนื่อง
  const series: PlatformDashboard["series"] = [];
  const lastBucket = bucketStart(resolved.endLocal, unit);
  for (
    let cur = bucketStart(resolved.startLocal, unit);
    cur <= lastBucket;
    cur = addUnit(cur, unit, 1)
  ) {
    const key = formatKey(cur);
    const row = byBucket.get(key);
    series.push({
      date: key,
      requests: Number(row?.requests ?? 0),
      success: Number(row?.success ?? 0),
      cost: Number(row?.cost ?? 0),
    });
  }

  const tryOnByBrand = new Map(
    perBrand.map((row) => [row.brand_id, row._count._all])
  );
  const costByBrand = new Map(
    perBrand.map((row) => [row.brand_id, Number(row._sum.cost ?? 0)])
  );

  const brandRows = brands
    .map((brand) => ({
      id: brand.id,
      brand_name: brand.brand_name,
      owner_name: brand.owner_name,
      email: brand.email,
      status: brand.status,
      products: brand._count.products,
      tryons: Number(tryOnByBrand.get(brand.id) ?? 0),
      cost: costByBrand.get(brand.id) ?? 0,
    }))
    .sort((a, b) => b.tryons - a.tryons || a.brand_name.localeCompare(b.brand_name, "th"));

  const topBrands = brandRows
    .filter((b) => b.tryons > 0)
    .slice(0, 3)
    .map((b) => ({ id: b.id, brand_name: b.brand_name, count: b.tryons }));

  return {
    range: {
      from: formatKey(resolved.startLocal),
      to: formatKey(resolved.endLocal),
      unit,
    },
    totals: {
      brands: brandCount,
      users: distinctUsers.length,
      requests,
      failed,
      cost: Number(costAgg._sum.cost ?? 0),
      avgDurationMs:
        durationAgg._avg.duration_ms === null
          ? null
          : Math.round(durationAgg._avg.duration_ms),
      cacheHits,
    },
    byProvider: perProvider.map((row) => ({
      provider: row.provider ?? "unknown",
      count: row._count._all,
      cost: Number(row._sum.cost ?? 0),
    })),
    pending: {
      brands: pendingBrands,
      appeals: pendingAppeals,
      ownerTransfers: pendingTransfers,
      aiReports: pendingReports,
    },
    series,
    topBrands,
    brands: brandRows,
  };
};
