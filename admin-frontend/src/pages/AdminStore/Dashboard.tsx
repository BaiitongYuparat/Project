import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DASHBOARD_DAY_OPTIONS,
  getShopDashboard,
  type DashboardDays,
  type ShopDashboard,
} from "../../services/ShopAdmin/dashboardService";

// Dashboard ของร้าน — ภาพรวมการใช้งาน Virtual Try-On เฉพาะร้านตัวเอง

const CATEGORY_LABELS: Record<string, string> = {
  top: "เสื้อ",
  bottom: "กางเกง",
  dress: "เดรส",
  skirt: "กระโปรง",
  set: "ชุด",
  accessories: "เครื่องประดับ",
};

const categoryLabel = (value: string) => CATEGORY_LABELS[value] ?? value;

const formatNumber = (n: number) => n.toLocaleString("th-TH");

// "2026-11-20" -> "20/11"
const formatShortDate = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
};

// ปัดค่าสูงสุดของแกน Y ให้เป็นเลขกลม ๆ (เช่น 173 -> 200)
const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
};

type DeltaProps = { change: number | null };

// ลูกศร + เปอร์เซ็นต์เปลี่ยนแปลงเทียบช่วงก่อนหน้า
function Delta({ change }: DeltaProps) {
  if (change === null) {
    return <span className="text-xs text-[#9A8F7D]">ไม่มีข้อมูลช่วงก่อนหน้าให้เทียบ</span>;
  }
  if (change === 0) {
    return <span className="text-xs text-[#9A8F7D]">เท่าเดิม</span>;
  }

  const positive = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-[#3F7A3A]" : "text-[#B4452F]"
      }`}
    >
      <span aria-hidden="true">{positive ? "▲" : "▼"}</span>
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: number;
  change?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[#E9DFC9] bg-white px-5 py-5">
      <p className="text-sm text-[#786E5D]">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[#332F29]">{formatNumber(value)}</p>
      <div className="mt-2 min-h-[18px]">
        {change !== undefined && <Delta change={change} />}
      </div>
    </div>
  );
}

// กราฟเส้น SVG — ไม่ต้องใช้ library เพิ่ม
function TryOnLineChart({ series }: { series: { date: string; count: number }[] }) {
  const WIDTH = 1000;
  const HEIGHT = 300;
  const TICK_COUNT = 4;

  const max = Math.max(...series.map((point) => point.count), 0);
  const top = niceMax(max);
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (top / TICK_COUNT) * i);

  const points = series.map((point, index) => ({
    x: series.length === 1 ? WIDTH / 2 : (index / (series.length - 1)) * WIDTH,
    y: HEIGHT - (point.count / top) * HEIGHT,
  }));

  const path = points
    .map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // ป้ายแกน X: แสดงทุกวันถ้าไม่เกิน 8 วัน ไม่งั้นเลือกให้เหลือ 6 ป้าย
  const labelCount = series.length <= 8 ? series.length : 6;
  const labelIndexes = Array.from({ length: labelCount }, (_, i) =>
    labelCount === 1
      ? 0
      : Math.round((i * (series.length - 1)) / (labelCount - 1))
  );

  return (
    <div className="mt-6">
      <div className="flex gap-3">
        {/* ป้ายแกน Y */}
        <div className="flex h-52 flex-col justify-between pb-0 text-right text-xs text-[#9A8F7D]">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{formatNumber(tick)}</span>
          ))}
        </div>

        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-52 w-full"
            role="img"
            aria-label="จำนวน Try-On รายวัน"
          >
            {ticks.map((tick) => {
              const y = HEIGHT - (tick / top) * HEIGHT;
              return (
                <line
                  key={tick}
                  x1="0"
                  x2={WIDTH}
                  y1={y}
                  y2={y}
                  stroke="#EFE7D6"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            <path
              d={path}
              fill="none"
              stroke="#2F4BD0"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      {/* ป้ายแกน X */}
      <div className="mt-2 flex justify-between pl-9">
        {labelIndexes.map((index, position) => (
          <span
            key={`${series[index]?.date}-${position}`}
            className="text-xs text-[#9A8F7D]"
          >
            {series[index] ? formatShortDate(series[index].date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ShopDashboard() {
  const { slug } = useParams<{ slug: string }>();

  const [days, setDays] = useState<DashboardDays>(30);
  const [data, setData] = useState<ShopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getShopDashboard(slug, days);
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Failed to fetch shop dashboard:", err);
        if (!cancelled) setError("ไม่สามารถโหลดข้อมูล Dashboard ได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, days]);

  const maxTopCount = useMemo(
    () => Math.max(...(data?.topProducts ?? []).map((p) => p.count), 1),
    [data]
  );

  const maxCategoryCount = useMemo(
    () => Math.max(...(data?.categories ?? []).map((c) => c.count), 1),
    [data]
  );

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 text-left sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#332F29] sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-[#786E5D]">
            ภาพรวมการใช้งาน Virtual Try-On ของร้านคุณ
          </p>
        </div>

        <label className="flex items-center gap-2">
          <span className="sr-only">ช่วงเวลา</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as DashboardDays)}
            className="rounded-xl border border-[#E9DFC9] bg-white px-4 py-2.5 text-sm text-[#332F29] focus:outline-none focus:ring-2 focus:ring-[#2F4BD0]/30"
          >
            {DASHBOARD_DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} วันล่าสุด
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[#F7DFD6] bg-white px-4 py-3 text-sm text-[#B4452F]">
          {error}
        </div>
      )}

      {/* การ์ดสรุป */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="จำนวน Try-On ทั้งหมด"
          value={data?.totals.tryons.value ?? 0}
          change={data?.totals.tryons.change ?? null}
        />
        <StatCard
          title="ผู้ลองไม่ซ้ำ"
          value={data?.totals.users.value ?? 0}
          change={data?.totals.users.change ?? null}
        />
        <StatCard title="สินค้าที่เปิดใช้งาน" value={data?.totals.activeProducts ?? 0} />
      </div>

      {/* กราฟ + สินค้ายอดนิยม */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#E9DFC9] bg-white p-5 xl:col-span-2">
          <h2 className="text-base font-bold text-[#332F29]">จำนวน Try-On รายวัน</h2>

          {loading && !data ? (
            <div className="flex h-56 items-center justify-center text-sm text-[#9A8F7D]">
              กำลังโหลด...
            </div>
          ) : (data?.series.length ?? 0) === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-[#9A8F7D]">
              ยังไม่มีข้อมูลในช่วงเวลานี้
            </div>
          ) : (
            <TryOnLineChart series={data!.series} />
          )}
        </section>

        <section className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-[#332F29]">สินค้าที่ถูกลองมากที่สุด</h2>
            <Link
              to={`/shopadmin/${slug}/products`}
              className="whitespace-nowrap text-sm text-[#2F4BD0] hover:underline"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {(data?.topProducts.length ?? 0) === 0 ? (
            <p className="mt-6 text-sm text-[#9A8F7D]">ยังไม่มีการลองสินค้าในช่วงเวลานี้</p>
          ) : (
            <ol className="mt-4 divide-y divide-[#F1EADB]">
              {data!.topProducts.map((product, index) => (
                <li key={product.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-sm text-[#9A8F7D]">
                      {index + 1}
                    </span>
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F1EADB]">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#332F29]">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#9A8F7D]">
                        {categoryLabel(product.category)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#332F29]">
                      {formatNumber(product.count)} ครั้ง
                    </span>
                  </div>

                  <div className="ml-7 mt-2 h-1.5 rounded-full bg-[#F1EADB]">
                    <div
                      className="h-full rounded-full bg-[#2F4BD0]"
                      style={{ width: `${(product.count / maxTopCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* ความนิยมตามหมวดหมู่ */}
      <section className="mt-4 rounded-2xl border border-[#E9DFC9] bg-white p-5">
        <h2 className="text-base font-bold text-[#332F29]">
          สินค้ายอดนิยมตาม Category
        </h2>

        {(data?.categories.length ?? 0) === 0 ? (
          <p className="mt-6 text-sm text-[#9A8F7D]">ยังไม่มีข้อมูลในช่วงเวลานี้</p>
        ) : (
          <div className="mt-5 space-y-4">
            {data!.categories.map((row) => (
              <div key={row.category} className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-sm text-[#332F29] sm:w-36">
                  {categoryLabel(row.category)}
                </span>
                <div className="h-2.5 flex-1 rounded-full bg-[#F1EADB]">
                  <div
                    className="h-full rounded-full bg-[#2F4BD0]"
                    style={{ width: `${(row.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-[#9A8F7D]">
                  {formatNumber(row.count)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
