import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBrands } from "../../../services/SuperAdmin/brandService";
import type { Brand, BrandStatus } from "../../../types/brand";


const statusLabel: Record<BrandStatus, { label: string; className: string }> = {
  APPROVED: { label: "ใช้งานอยู่", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  PENDING: { label: "รอดำเนินการ", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  REJECTED: { label: "ถูกปฏิเสธ", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const statusOrder: Record<BrandStatus, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

//แปลงตัวเลขเป็นรูปแบบไทย
const formatNumber = (n: number) => n.toLocaleString("th-TH");

// แสดงสถิติของร้านค้า
function StatCard({ title, value, caption }: { title: string; value: number; caption: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-600">{title}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-stone-500">{caption}</p>
    </div>
  );
}

// แสดงสถานะของร้านค้า
function StatusBadge({ status, className = "" }: { status: BrandStatus; className?: string }) {
  const s = statusLabel[status];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className} ${className}`}>
      {s.label}
    </span>
  );
}

function DetailLink({ id, name }: { id: string; name: string }) {

  return (
    <Link
      to={`/superadmin/store-management/${id}`}
      aria-label={`ดูรายละเอียด ${name}`}
      className="inline-flex text-sm items-center gap-1 whitespace-nowrap text-blue-700 hover:text-blue-900 hover:underline"
    >
      ดูรายละเอียด
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
        <path d="M7 4l6 6-6 6" />
      </svg>
    </Link>
  );
}

//จำนวนหน้าที่กำหนดให้แสดง
const PAGE_SIZE_OPTIONS = [10, 20, 50];


export default function StoreManagement() {
  const [stores, setStores] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BrandStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // ดึงข้อมูลร้านค้า
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      setStores(await getBrands());
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      setError("ไม่สามารถโหลดข้อมูลร้านค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, filter]);

  // คำนวณสถิติของร้านค้า
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: stores.length,
      approved: stores.filter((s) => s.status === "APPROVED").length,
      rejected: stores.filter((s) => s.status === "REJECTED").length,
      newThisMonth: stores.filter((s) => {
        const d = new Date(s.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [stores]);

  // กรองและค้นหาร้านค้าที่จะแสดง
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores
      .filter((s) => filter === "ALL" || s.status === filter)
      .filter(
        (s) =>
          !q ||
          s.brand_name.toLowerCase().includes(q) ||
          s.owner_name.toLowerCase().includes(q)
      )
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [stores, query, filter]);

  //totalPages จำนวนหน้าทั้งหมด
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize)); // จำนวนหน้าทั้งหมด (อย่างน้อย 1)
  //currentPage คือหน้าปัจจุบันที่ปลอดภัย
  const currentPage = Math.min(page, totalPages); // กันหน้าเกินเมื่อข้อมูลลดลง
  //startIdx คือตำแหน่งเริ่มต้นใน array
  const startIdx = (currentPage - 1) * pageSize; // index เริ่มต้นของหน้านี้
  //paged คือรายชื่อเฉพาะหน้านี้
  const paged = useMemo(
    () => visible.slice(startIdx, startIdx + pageSize), // ตัดเฉพาะแถวของหน้านี้
    [visible, startIdx, pageSize]
  );
  //from และ to คือตัวเลขสำหรับข้อความ "แสดง X–Y จาก Z ผู้ใช้
  const from = visible.length === 0 ? 0 : startIdx + 1; // ลำดับแถวแรกที่แสดง
  const to = Math.min(startIdx + pageSize, visible.length); // ลำดับแถวสุดท้ายที่แสดง

  return (
    <div className="space-y-5 ">
      <header className="pb-2 text-left">
        <h1 className="text-xl font-bold text-stone-900 ">Store Management</h1>

      </header>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="ร้านค้าทั้งหมด" value={stats.total} caption="ร้านค้าในระบบทั้งหมด" />
        <StatCard title="ใช้งานอยู่" value={stats.approved} caption="ร้านค้าที่พร้อมใช้งาน" />
        <StatCard title="ร้านค้าใหม่" value={stats.newThisMonth} caption="ร้านค้าที่เพิ่มในเดือนนี้" />
        <StatCard title="ถูกระงับ" value={stats.rejected} caption="ร้านค้าที่ถูกระงับการใช้งาน" />
      </div>


      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500"
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อร้านค้า หรือเจ้าของร้าน"
            className="w-full text-sm rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as BrandStatus | "ALL")}
          className="rounded-xl border text-sm border-stone-200 bg-white px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 sm:w-56"
        >
          <option value="ALL"> ทั้งหมด</option>
          <option value="PENDING"> รอดำเนินการ</option>
          <option value="APPROVED"> ใช้งานอยู่</option>
          <option value="REJECTED"> ถูกปฏิเสธ</option>
        </select>
      </div>


      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
          <h2 className="text-base font-bold text-stone-900 sm:text-lg">รายชื่อร้านค้า</h2>
          <span className="text-sm text-stone-500">{formatNumber(visible.length)} ร้านค้า</span>
        </div>

        {loading && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">กำลังโหลด...</div>
        )}

        {!loading && error && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-red-600">
            {error}{" "}
            <button type="button" onClick={fetchStores} className="text-blue-700 underline">
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
            {stores.length === 0 ? "ยังไม่มีร้านค้า" : "ไม่พบร้านค้าที่ตรงกับเงื่อนไข"}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <>

            <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
              {paged.map((store) => (
                <li key={store.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900 text-sm">{store.brand_name}</p>
                      <p className="mt-1 truncate text-sm text-stone-900 ">{store.owner_name}</p>
                      <p className="break-all text-sm text-stone-500">{store.email ?? "-"}</p>
                    </div>
                    <StatusBadge status={store.status} className="shrink-0" />
                  </div>
                  <div className="mt-3 text-sm">
                    <DetailLink id={store.id} name={store.brand_name} />
                  </div>
                </li>
              ))}
            </ul>


            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th scope="col" className="px-8 py-4 font-normal">ร้านค้า</th>
                    <th scope="col" className="px-4 py-4 font-normal">เจ้าของ</th>
                    <th scope="col" className="px-4 py-4 font-normal">สถานะ</th>
                    <th scope="col" className="px-8 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((store) => (
                    <tr key={store.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-8 py-4 font-medium text-stone-900">{store.brand_name}</td>
                      <td className="px-4 py-4">
                        <div className="text-stone-900">{store.owner_name}</div>
                        <div className="break-all text-sm text-stone-500">{store.email ?? "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={store.status} />
                      </td>
                      <td className="px-8 py-4 text-right">
                        <DetailLink id={store.id} name={store.brand_name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
              <p className="text-sm text-stone-500">
                แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(visible.length)} ร้านค้า
              </p>

              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">แถวต่อหน้า</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="แถวต่อหน้า"
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="หน้าก่อนหน้า"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12.5 4.5L7 10l5.5 5.5" />
                  </svg>
                </button>

                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-indigo-50 px-3 text-sm font-medium text-blue-700">
                  {formatNumber(currentPage)}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="หน้าถัดไป"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7.5 4.5L13 10l-5.5 5.5" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}