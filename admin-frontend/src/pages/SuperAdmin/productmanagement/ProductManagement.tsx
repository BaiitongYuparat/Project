// import { useEffect, useMemo, useState } from "react";
// import {
//     getProductStats,
//     getAdminProducts,
//     type AdminProductStats,
//     type AdminProductRow,
// } from "../../../services/SuperAdmin/productsService";

// const formatNumber = (n: number) => n.toLocaleString("th-TH");

// type ProductQuality = "PASS" | "FAIL" | "PENDING";

// const QUALITY_BADGE: Record<ProductQuality, { label: string; className: string }> = {
//     PASS: { label: "AI ผ่าน", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
//     FAIL: { label: "AI ไม่ผ่าน", className: "bg-rose-50 text-rose-700 ring-rose-200" },
//     PENDING: { label: "รอผลตรวจ", className: "bg-stone-50 text-stone-600 ring-stone-200" },
// };

// const PAGE_SIZE_OPTIONS = [10, 20, 50];

// function StatCard({ title, value, caption }: { title: string; value: number; caption: string }) {
//     return (
//         <div className="rounded-2xl border border-stone-200 bg-white p-4">
//             <p className="text-sm text-stone-600">{title}</p>
//             <p className="mt-1 text-2xl font-bold text-stone-900">{formatNumber(value)}</p>
//             <p className="mt-1 text-xs text-stone-500">{caption}</p>
//         </div>
//     );
// }

// function Badge({ quality, className = "" }: { quality: ProductQuality; className?: string }) {
//     const b = QUALITY_BADGE[quality];
//     return (
//         <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${b.className} ${className}`}>
//             {b.label}
//         </span>
//     );
// }

// function Thumb({ src, name }: { src?: string | null; name: string }) {
//     return src ? (
//         <img src={src} alt={name} className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 object-cover" />
//     ) : (
//         <div className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 bg-stone-50" />
//     );
// }

// export default function ProductManagementSU() {
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [stats, setStats] = useState<AdminProductStats | null>(null);
//     const [products, setProducts] = useState<AdminProductRow[]>([]);

//     const [search, setSearch] = useState("");
//     const [brandFilter, setBrandFilter] = useState("");
//     const [page, setPage] = useState(1);
//     const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             try {
//                 const [statsData, productsData] = await Promise.all([
//                     getProductStats(),
//                     getAdminProducts(),
//                 ]);
//                 if (!cancelled) {
//                     setStats(statsData);
//                     setProducts(productsData);
//                 }
//             } catch (e) {
//                 console.error(e);
//                 if (!cancelled) setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
//             } finally {
//                 if (!cancelled) setLoading(false);
//             }
//         })();
//         return () => {
//             cancelled = true;
//         };
//     }, []);

//     useEffect(() => {
//         setPage(1);
//     }, [search, brandFilter, pageSize]);

//     // รายชื่อร้านสำหรับ dropdown
//     const brands = useMemo(
//         () => Array.from(new Set(products.map((p) => p.brand.name))).sort(),
//         [products]
//     );

//     // กรองฝั่ง frontend ไปก่อน (ถ้าข้อมูลเยอะค่อยย้ายไป backend)
//     const filtered = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return products.filter((p) => {
//             if (brandFilter && p.brand.name !== brandFilter) return false;
//             if (!q) return true;
//             return (
//                 p.name.toLowerCase().includes(q) ||
//                 (p.sku ?? "").toLowerCase().includes(q)
//             );
//         });
//     }, [products, search, brandFilter]);

//     const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
//     const currentPage = Math.min(page, totalPages);
//     const startIdx = (currentPage - 1) * pageSize;
//     const paged = useMemo(
//         () => filtered.slice(startIdx, startIdx + pageSize),
//         [filtered, startIdx, pageSize]
//     );
//     const from = filtered.length === 0 ? 0 : startIdx + 1;
//     const to = Math.min(startIdx + pageSize, filtered.length);

//     return (
//         <div className="space-y-5">
//             <header className="pb-2 text-left">
//                 <h1 className="text-xl font-bold text-stone-900">Product Management</h1>
//             </header>

//             <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
//                 <StatCard title="สินค้าทั้งหมด" value={stats?.total ?? 0} caption="สินค้าในระบบทั้งหมด" />
//                 <StatCard title="AI ผ่าน" value={stats?.pass ?? 0} caption="รูปผ่านการตรวจทุกรูป" />
//                 <StatCard title="AI ไม่ผ่าน" value={stats?.fail ?? 0} caption="มีรูปไม่ผ่านอย่างน้อย 1 รูป" />
//             </div>

//             <div className="flex flex-col gap-3 sm:flex-row">
//                 <div className="relative flex-1">
//                     <svg
//                         className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500"
//                         viewBox="0 0 20 20"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="1.8"
//                         strokeLinecap="round"
//                         aria-hidden="true"
//                     >
//                         <circle cx="9" cy="9" r="6" />
//                         <path d="M14 14l3.5 3.5" />
//                     </svg>
//                     <input
//                         value={search}
//                         onChange={(e) => setSearch(e.target.value)}
//                         placeholder="ค้นหาชื่อสินค้า หรือรหัสสินค้า"
//                         className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
//                     />
//                 </div>
//                 <select
//                     value={brandFilter}
//                     onChange={(e) => setBrandFilter(e.target.value)}
//                     className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 sm:w-56"
//                 >
//                     <option value="">ร้านค้าทั้งหมด</option>
//                     {brands.map((b) => (
//                         <option key={b} value={b}>{b}</option>
//                     ))}
//                 </select>
//             </div>

//             <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white text-left">
//                 <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
//                     <h2 className="text-base font-bold text-stone-900 sm:text-lg">รายการสินค้า</h2>
//                     <span className="text-sm text-stone-500">{formatNumber(filtered.length)} รายการ</span>
//                 </div>

//                 {loading && (
//                     <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">กำลังโหลด...</div>
//                 )}

//                 {!loading && error && (
//                     <div className="border-t border-stone-200 px-4 py-10 text-center text-red-600">{error}</div>
//                 )}

//                 {!loading && !error && filtered.length === 0 && (
//                     <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
//                         {products.length === 0 ? "ยังไม่มีสินค้า" : "ไม่พบสินค้าที่ตรงกับเงื่อนไข"}
//                     </div>
//                 )}

//                 {!loading && !error && filtered.length > 0 && (
//                     <>
//                         {/* มือถือ */}
//                         <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
//                             {paged.map((p) => (
//                                 <li key={p.id} className="px-4 py-4 sm:px-6">
//                                     <div className="flex items-start justify-between gap-3">
//                                         <div className="flex min-w-0 items-start gap-3">
//                                             <Thumb src={p.thumbnail} name={p.name} />
//                                             <div className="min-w-0">
//                                                 <p className="truncate text-sm font-medium text-stone-900">{p.name}</p>
//                                                 <p className="mt-1 truncate text-sm text-stone-900">{p.brand.name}</p>
//                                                 <p className="text-sm text-stone-500">SKU {p.sku ?? "-"}</p>
//                                             </div>
//                                         </div>
//                                         <Badge quality={p.quality} className="shrink-0" />
//                                     </div>
//                                 </li>
//                             ))}
//                         </ul>

//                         {/* เดสก์ท็อป */}
//                         <div className="hidden overflow-x-auto md:block">
//                             <table className="w-full text-left text-sm">
//                                 <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
//                                     <tr>
//                                         <th scope="col" className="px-8 py-4 font-normal">รูป</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">สินค้า</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">ร้านค้า</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">ผลตรวจรูป</th>
//                                         <th scope="col" className="px-8 py-4 font-normal">เปิดให้ Try-On</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {paged.map((p) => (
//                                         <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50">
//                                             <td className="px-8 py-4">
//                                                 <Thumb src={p.thumbnail} name={p.name} />
//                                             </td>
//                                             <td className="px-4 py-4">
//                                                 <div className="font-medium text-stone-900">{p.name}</div>
//                                                 <div className="text-sm text-stone-500">SKU {p.sku ?? "-"}</div>
//                                             </td>
//                                             <td className="px-4 py-4 text-stone-900">{p.brand.name}</td>
//                                             <td className="px-4 py-4">
//                                                 <Badge quality={p.quality} />
//                                             </td>
//                                             <td className="px-8 py-4"></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Pagination */}
//                         <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
//                             <p className="text-sm text-stone-500">
//                                 แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(filtered.length)} รายการ
//                             </p>

//                             <div className="flex items-center gap-2">
//                                 <span className="text-sm text-stone-500">แถวต่อหน้า</span>
//                                 <select
//                                     value={pageSize}
//                                     onChange={(e) => setPageSize(Number(e.target.value))}
//                                     aria-label="แถวต่อหน้า"
//                                     className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
//                                 >
//                                     {PAGE_SIZE_OPTIONS.map((n) => (
//                                         <option key={n} value={n}>{n}</option>
//                                     ))}
//                                 </select>

//                                 <button
//                                     type="button"
//                                     onClick={() => setPage(currentPage - 1)}
//                                     disabled={currentPage <= 1}
//                                     aria-label="หน้าก่อนหน้า"
//                                     className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
//                                 >
//                                     <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
//                                         <path d="M12.5 4.5L7 10l5.5 5.5" />
//                                     </svg>
//                                 </button>

//                                 <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-indigo-50 px-3 text-sm font-medium text-blue-700">
//                                     {formatNumber(currentPage)}
//                                 </span>

//                                 <button
//                                     type="button"
//                                     onClick={() => setPage(currentPage + 1)}
//                                     disabled={currentPage >= totalPages}
//                                     aria-label="หน้าถัดไป"
//                                     className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
//                                 >
//                                     <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
//                                         <path d="M7.5 4.5L13 10l-5.5 5.5" />
//                                     </svg>
//                                 </button>
//                             </div>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// }