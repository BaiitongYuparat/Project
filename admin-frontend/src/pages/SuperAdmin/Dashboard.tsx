import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardStats,
  type DashboardBucket,
  type DashboardRange,
  type DashboardStats,
} from "../../services/SuperAdmin/dashboardService";

// ภาพรวมแพลตฟอร์ม — Super Admin เห็นสถิติการใช้งานและรายชื่อร้านค้าทั้งหมดในหน้าเดียว

const RANGE_TABS: { value: DashboardRange; label: string }[] = [
  { value: "day", label: "รายวัน" },
  { value: "week", label: "รายสัปดาห์" },
  { value: "month", label: "รายเดือน" },
  { value: "year", label: "รายปี" },
  { value: "custom", label: "กำหนดเอง" },
];

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// index = getUTCDay() (0 = อาทิตย์)
const THAI_WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const STATUS_META: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "พร้อมใช้งาน", className: "bg-[#E8F0DE] text-[#4F6B2E]" },
  PENDING: { label: "รอตรวจสอบ", className: "bg-[#F7E8D2] text-[#8D6428]" },
  REJECTED: { label: "ระงับการใช้งาน", className: "bg-[#F7DFD6] text-[#B4452F]" },
};

const PAGE_SIZE = 5;

const pad2 = (n: number) => String(n).padStart(2, "0");

// แปลง "YYYY-MM-DD" เป็น Date แบบ UTC เพื่อไม่ให้วันเลื่อนตาม timezone ของเบราว์เซอร์
const parseIsoDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const daysAgoLocalIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalIso(d);
};

const formatNumber = (n: number) => n.toLocaleString("th-TH");

const formatUsd = (n: number) =>
  `$${n.toLocaleString("en-US", {
    minimumFractionDigits: n > 0 && n < 1 ? 4 : 2,
    maximumFractionDigits: n > 0 && n < 1 ? 4 : 2,
  })}`;

const formatSeconds = (ms: number | null) =>
  ms === null ? "—" : `${(ms / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })} วิ`;

const buddhistYear = (d: Date) => d.getUTCFullYear() + 543;

// "12–18 ต.ค. 2569" / "พ.ย. 2568 – ต.ค. 2569" / "2564 – 2569"
const formatRangeLabel = (
  fromIso: string,
  toIso: string,
  unit: DashboardBucket
) => {
  const a = parseIsoDate(fromIso);
  const b = parseIsoDate(toIso);

  if (unit === "year") {
    return buddhistYear(a) === buddhistYear(b)
      ? String(buddhistYear(b))
      : `${buddhistYear(a)} – ${buddhistYear(b)}`;
  }

  if (unit === "month") {
    const aLabel = `${THAI_MONTHS_SHORT[a.getUTCMonth()]} ${buddhistYear(a)}`;
    const bLabel = `${THAI_MONTHS_SHORT[b.getUTCMonth()]} ${buddhistYear(b)}`;
    return aLabel === bLabel ? bLabel : `${aLabel} – ${bLabel}`;
  }

  // day / week
  if (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  ) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${THAI_MONTHS_SHORT[b.getUTCMonth()]} ${buddhistYear(b)}`;
  }

  return `${a.getUTCDate()} ${THAI_MONTHS_SHORT[a.getUTCMonth()]} – ${b.getUTCDate()} ${THAI_MONTHS_SHORT[b.getUTCMonth()]} ${buddhistYear(b)}`;
};

// label ใต้แท่งกราฟ
const formatBucketLabel = (iso: string, unit: DashboardBucket) => {
  const d = parseIsoDate(iso);
  if (unit === "day") return THAI_WEEKDAYS_SHORT[d.getUTCDay()];
  if (unit === "month") return THAI_MONTHS_SHORT[d.getUTCMonth()];
  if (unit === "year") return String(buddhistYear(d));
  return `${d.getUTCDate()} ${THAI_MONTHS_SHORT[d.getUTCMonth()]}`;
};

function StatCard({
  title,
  value,
  valueClassName,
  hint,
}: {
  title: string;
  value: number | string;
  valueClassName: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EADFC9] bg-white px-5 py-5">
      <p className="text-sm text-[#928474]">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClassName}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint && <p className="mt-1 text-xs text-[#928474]">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "bg-[#F1EADB] text-[#928474]",
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

// สร้างเลขหน้าแบบ 1 … 3 4 5 … 26
const buildPageList = (current: number, total: number) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const withGaps: (number | "gap")[] = [];
  list.forEach((page, index) => {
    if (index > 0 && page - list[index - 1] > 1) withGaps.push("gap");
    withGaps.push(page);
  });
  return withGaps;
};

export default function Dashboard() {
  const [range, setRange] = useState<DashboardRange>("day");
  const [from, setFrom] = useState(() => daysAgoLocalIso(6));
  const [to, setTo] = useState(() => daysAgoLocalIso(0));

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING">("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getDashboardStats(range, { from, to });
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (!cancelled) setError("ไม่สามารถโหลดสถิติการใช้งานได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, from, to]);

  const resetPage = () => setPage(1);

  const pendingCount = useMemo(
    () => (data?.brands ?? []).filter((b) => b.status === "PENDING").length,
    [data]
  );

  // กรอง/ค้นหาร้านค้าที่จะแสดงในตาราง
  const visibleBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.brands ?? [])
      .filter((b) => filter === "ALL" || b.status === "PENDING")
      .filter(
        (b) =>
          !q ||
          b.brand_name.toLowerCase().includes(q) ||
          b.owner_name.toLowerCase().includes(q) ||
          (b.email ?? "").toLowerCase().includes(q)
      );
  }, [data, filter, query]);

  const totalPages = Math.max(1, Math.ceil(visibleBrands.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pagedBrands = visibleBrands.slice(startIdx, startIdx + PAGE_SIZE);
  const fromRow = visibleBrands.length === 0 ? 0 : startIdx + 1;
  const toRow = Math.min(startIdx + PAGE_SIZE, visibleBrands.length);

  const series = data?.series ?? [];
  const maxSeriesValue = Math.max(
    1,
    ...series.map((s) => Math.max(s.requests, s.success))
  );

  const totalSuccess = series.reduce((sum, s) => sum + s.success, 0);
  const totalRequests = data?.totals.requests ?? 0;
  const successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0;
  const avgCost = totalSuccess > 0 ? (data?.totals.cost ?? 0) / totalSuccess : 0;

  const unit = data?.range.unit ?? "day";
  const rangeLabel = data
    ? formatRangeLabel(data.range.from, data.range.to, unit)
    : "—";

  return (
    <div className="-m-5 min-h-screen bg-[#FBF7EC] p-5 text-left text-[#5F5144] md:-m-8 md:p-8">
      {/* Header + ช่วงเวลา */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2C25]">ภาพรวมแพลตฟอร์ม</h1>
          <p className="mt-1 text-sm text-[#928474]">
            ติดตามการใช้งานและดูแลร้านค้าทั้งหมดจากที่เดียว
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="inline-flex w-fit items-center rounded-full bg-[#E8EDFB] px-4 py-2 text-sm font-medium text-[#2F4BD0]">
            {rangeLabel}
          </span>

          <div className="flex flex-wrap gap-2">
            {RANGE_TABS.map((tab) => {
              const active = tab.value === range;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setRange(tab.value)}
                  aria-pressed={active}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#2F4BD0] text-white"
                      : "border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* เลือกช่วงวันที่เอง */}
      {range === "custom" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#EADFC9] bg-[#F5EFDF] px-4 py-3 sm:flex-row sm:items-center">
          <span className="text-sm text-[#928474]">ช่วงวันที่</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="วันที่เริ่มต้น"
              className="rounded-lg border border-[#EADFC9] bg-white px-3 py-2 text-sm text-[#3B2C25] focus:outline-none focus:ring-2 focus:ring-[#2F4BD0]/30"
            />
            <span className="text-sm text-[#928474]">ถึง</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              aria-label="วันที่สิ้นสุด"
              className="rounded-lg border border-[#EADFC9] bg-white px-3 py-2 text-sm text-[#3B2C25] focus:outline-none focus:ring-2 focus:ring-[#2F4BD0]/30"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-[#F7DFD6] bg-white px-4 py-3 text-sm text-[#B4452F]">
          {error}
        </div>
      )}

      {/* การ์ดตัวเลข 4 ใบ */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="ร้านค้าทั้งหมด"
          value={data?.totals.brands ?? 0}
          valueClassName="text-[#3B2C25]"
        />
        <StatCard
          title="ผู้ใช้ที่ลองสินค้า"
          value={data?.totals.users ?? 0}
          valueClassName="text-[#2F4BD0]"
        />
        <StatCard
          title="คำขอลองสินค้า"
          value={data?.totals.requests ?? 0}
          valueClassName="text-[#3B2C25]"
        />
        <StatCard
          title="คำขอไม่สำเร็จ"
          value={data?.totals.failed ?? 0}
          valueClassName="text-[#B4452F]"
        />
      </div>

      {/* ต้นทุน AI และประสิทธิภาพ */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="ต้นทุน AI รวม"
          value={formatUsd(data?.totals.cost ?? 0)}
          valueClassName="text-[#8D6428]"
          hint="เฉพาะ Virtual Try-On · ไม่รวมค่า Gemini"
        />
        <StatCard
          title="ต้นทุนเฉลี่ยต่อภาพ"
          value={formatUsd(avgCost)}
          valueClassName="text-[#3B2C25]"
          hint="ต่อคำขอที่สำเร็จ"
        />
        <StatCard
          title="อัตราสำเร็จ"
          value={`${successRate.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`}
          valueClassName="text-[#4F6B2E]"
          hint={`เวลาประมวลผลเฉลี่ย ${formatSeconds(data?.totals.avgDurationMs ?? null)}`}
        />
        <StatCard
          title="ผลที่คืนจากแคช"
          value={data?.totals.cacheHits ?? 0}
          valueClassName="text-[#2F4BD0]"
          hint="ไม่เสียค่า AI"
        />
      </div>

      {/* งานที่รอจัดการ + ต้นทุนตาม provider */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#EADFC9] bg-white p-5 xl:col-span-2">
          <h2 className="text-base font-bold text-[#3B2C25]">งานที่รอจัดการ</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "ร้านรอตรวจสอบ", count: data?.pending.brands ?? 0, to: "/superadmin/store-management" },
              { label: "คำร้องปลดระงับ", count: data?.pending.appeals ?? 0, to: "/superadmin/appeals" },
              { label: "ขอเปลี่ยนเจ้าของร้าน", count: data?.pending.ownerTransfers ?? 0, to: "/superadmin/owner-transfer-requests" },
              { label: "รายงานปัญหา AI", count: data?.pending.aiReports ?? 0, to: "/superadmin/ai-reports" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-xl border border-[#F1EADB] bg-[#FBF7EC] px-4 py-3 transition hover:bg-[#F5EFDF]"
              >
                <p className="text-xs text-[#928474]">{item.label}</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    item.count > 0 ? "text-[#B4452F]" : "text-[#3B2C25]"
                  }`}
                >
                  {formatNumber(item.count)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#EADFC9] bg-white p-5">
          <h2 className="text-base font-bold text-[#3B2C25]">ต้นทุนตาม Provider</h2>
          {(data?.byProvider.length ?? 0) === 0 ? (
            <p className="mt-4 text-sm text-[#928474]">ยังไม่มีการใช้งานในช่วงเวลานี้</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#F1EADB]">
              {data?.byProvider.map((p) => (
                <li key={p.provider} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium uppercase text-[#5F5144]">{p.provider}</span>
                  <span className="text-[#928474]">
                    {formatNumber(p.count)} ครั้ง ·{" "}
                    <span className="font-medium text-[#3B2C25]">{formatUsd(p.cost)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* กราฟ + อันดับร้าน */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#EADFC9] bg-white p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-[#3B2C25]">
              การใช้งาน Virtual Try-On
            </h2>
            <Link
              to="/superadmin/ai-reports"
              className="whitespace-nowrap text-sm text-[#2F4BD0] hover:underline"
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>

          {loading && !data ? (
            <div className="flex h-56 items-center justify-center text-sm text-[#928474]">
              กำลังโหลด...
            </div>
          ) : series.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-[#928474]">
              ยังไม่มีข้อมูลการใช้งานในช่วงเวลานี้
            </div>
          ) : (
            <>
              <div className="mt-6 flex h-44 items-end gap-2">
                {series.map((point) => (
                  <div
                    key={point.date}
                    className="flex h-full flex-1 items-end justify-center gap-1"
                    title={`${point.date}: คำขอ ${formatNumber(point.requests)} · สำเร็จ ${formatNumber(point.success)} · ต้นทุน ${formatUsd(point.cost)}`}
                  >
                    <div
                      style={{
                        // วัน/ช่วงที่ไม่มีข้อมูล = ไม่มีแท่ง (0%) ไม่ใช่แท่งจิ๋ว
                        height:
                          point.requests === 0
                            ? 0
                            : `${Math.max((point.requests / maxSeriesValue) * 100, 2)}%`,
                      }}
                      className="w-2.5 rounded-t bg-[#E7DCC3] md:w-3"
                    />
                    <div
                      style={{
                        height:
                          point.success === 0
                            ? 0
                            : `${Math.max((point.success / maxSeriesValue) * 100, 2)}%`,
                      }}
                      className="w-2.5 rounded-t bg-[#3B5BDB] md:w-3"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2 border-t border-[#F1EADB] pt-2">
                {series.map((point) => (
                  <span
                    key={point.date}
                    className="flex-1 text-center text-xs text-[#928474]"
                  >
                    {formatBucketLabel(point.date, unit)}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#928474]">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#E7DCC3]" />
                  คำขอลองสินค้า
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#3B5BDB]" />
                  ประมวลผลสำเร็จ
                </span>
              </div>

              <p className="mt-3 text-xs text-[#928474]">
                ความสูงของแท่งเทียบกับค่าสูงสุดในช่วงเวลาที่เลือก · ไม่นับผลที่ได้จากแคช
              </p>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[#EADFC9] bg-white p-5">
          <h2 className="text-base font-bold text-[#3B2C25]">
            ร้านค้าที่มีการใช้งานสูงสุด
          </h2>

          {(data?.topBrands.length ?? 0) === 0 ? (
            <p className="mt-6 text-sm text-[#928474]">
              ยังไม่มีการใช้งานในช่วงเวลานี้
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-[#F1EADB]">
              {data?.topBrands.map((brand, index) => (
                <li key={brand.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1EADB] text-xs font-semibold text-[#8D6428]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[#5F5144]">
                    {brand.brand_name}
                  </span>
                  <span className="text-sm font-medium text-[#3B2C25]">
                    {formatNumber(brand.count)}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-4 border-t border-[#F1EADB] pt-3 text-xs text-[#928474]">
            หน่วย: ครั้ง · ช่วงเวลาที่เลือก
          </p>
        </section>
      </div>

      {/* ตารางร้านค้า */}
      <section className="mt-4 rounded-2xl border border-[#EADFC9] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <h2 className="text-base font-bold text-[#3B2C25]">
            ภาพรวมร้านค้าทั้งหมด
          </h2>
          <Link
            to="/superadmin/store-management"
            className="text-sm text-[#2F4BD0] hover:underline"
          >
            ไปที่ Store Management
          </Link>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFilter("ALL");
                resetPage();
              }}
              aria-pressed={filter === "ALL"}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === "ALL"
                  ? "bg-[#2F4BD0] text-white"
                  : "border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3]"
              }`}
            >
              ทั้งหมด {formatNumber(data?.totals.brands ?? 0)}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("PENDING");
                resetPage();
              }}
              aria-pressed={filter === "PENDING"}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === "PENDING"
                  ? "bg-[#2F4BD0] text-white"
                  : "border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3]"
              }`}
            >
              รอตรวจสอบ {String(pendingCount).padStart(2, "0")}
            </button>
          </div>

          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#928474]"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="M14 14l3.5 3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder="ค้นหาชื่อร้านค้า หรืออีเมล..."
              className="w-full rounded-full border border-[#EADFC9] bg-white py-2.5 pl-11 pr-4 text-sm text-[#3B2C25] placeholder:text-[#B3A897] focus:outline-none focus:ring-2 focus:ring-[#2F4BD0]/30"
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="border-t border-[#F1EADB] px-5 py-10 text-center text-sm text-[#928474]">
            กำลังโหลด...
          </div>
        ) : visibleBrands.length === 0 ? (
          <div className="border-t border-[#F1EADB] px-5 py-10 text-center text-sm text-[#928474]">
            ไม่พบร้านค้าที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-y border-[#F1EADB] bg-[#F5EFDF] text-xs text-[#928474]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-normal">
                      ร้านค้า / ผู้ติดต่อ
                    </th>
                    <th scope="col" className="px-4 py-3 font-normal">
                      สถานะ
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">
                      สินค้า
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">
                      การลองสินค้า
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">
                      ต้นทุน AI
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-normal">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBrands.map((brand) => (
                    <tr
                      key={brand.id}
                      className="border-b border-[#F7F1E3] last:border-0 hover:bg-[#FBF7EC]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#3B2C25]">
                          {brand.brand_name}
                        </p>
                        <p className="mt-0.5 text-xs text-[#928474]">
                          {brand.email ?? brand.owner_name}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={brand.status} />
                      </td>
                      <td className="px-4 py-4 text-right text-[#5F5144]">
                        {formatNumber(brand.products)}
                      </td>
                      <td className="px-4 py-4 text-right text-[#5F5144]">
                        {formatNumber(brand.tryons)}
                      </td>
                      <td className="px-4 py-4 text-right text-[#5F5144]">
                        {formatUsd(brand.cost)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/superadmin/store-management/${brand.id}`}
                          className="text-sm text-[#2F4BD0] hover:underline"
                        >
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#F1EADB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#928474]">
                แสดง {formatNumber(fromRow)}–{formatNumber(toRow)} จาก{" "}
                {formatNumber(visibleBrands.length)} ร้านค้า
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="หน้าก่อนหน้า"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12.5 4.5L7 10l5.5 5.5" />
                  </svg>
                </button>

                {buildPageList(currentPage, totalPages).map((item, index) =>
                  item === "gap" ? (
                    <span
                      key={`gap-${index}`}
                      className="px-1 text-sm text-[#B3A897]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition ${
                        item === currentPage
                          ? "bg-[#2F4BD0] text-white"
                          : "border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3]"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="หน้าถัดไป"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EADFC9] bg-white text-[#5F5144] hover:bg-[#F7F1E3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7.5 4.5L13 10l-5.5 5.5" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
