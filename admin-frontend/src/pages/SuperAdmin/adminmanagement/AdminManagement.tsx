// import { useEffect, useMemo, useState } from "react";
// import { getBrandMembers } from "../../../services/SuperAdmin/brandService";
// import type { BrandMemberRole, BrandMember, BrandStatus } from "../../../types/brand";

// //แปลงตัวเลขเป็นรูปแบบไทย
// const formatNumber = (n: number) => n.toLocaleString("th-TH");

// const ROLE_LABEL: Record<BrandMemberRole, { label: string; className: string }> = {
//     OWNER: { label: "เจ้าของร้าน", className: "bg-amber-50 text-amber-700 ring-amber-200" },
//     ADMIN: { label: "แอดมิน", className: "bg-sky-50 text-sky-700 ring-sky-200" },
// };

// function RoleBadge({ role }: { role: BrandMemberRole }) {
//     const r = ROLE_LABEL[role];
//     if (!r) return <span>{role}</span>;
//     return (
//         <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${r.className}`}>
//             {r.label}
//         </span>
//     );
// }

// const STATUS_LABEL: Record<BrandStatus, { label: string; className: string }> = {
//     APPROVED: { label: "ใช้งานอยู่", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
//     PENDING: { label: "รอดำเนินการ", className: "bg-amber-50 text-amber-700 ring-amber-200" },
//     REJECTED: { label: "ถูกระงับ", className: "bg-rose-50 text-rose-700 ring-rose-200" },
// };

// function StatusBadge({ status }: { status: BrandStatus }) {
//     const s = STATUS_LABEL[status];
//     if (!s) return <span>{status}</span>;
//     return (
//         <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
//             {s.label}
//         </span>
//     );
// }

// //จำนวนหน้าที่กำหนดให้แสดง
// const PAGE_SIZE_OPTIONS = [10, 20, 50];

// export default function AdminManagement() {
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [members, setMembers] = useState<BrandMember[]>([]);
//     const [page, setPage] = useState(1);
//     const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

//     const fetchBrands = async () => {
//         try {
//             setLoading(true);
//             setError(null);
//             const data = await getBrandMembers();
//             setMembers(data);
//         } catch (err) {
//             console.error("Failed to fetch brands:", err);
//             setError("ไม่สามารถโหลดข้อมูล Admin ร้านค้าได้");
//         } finally {
//             setLoading(false);
//         }
//     };
//     useEffect(() => {
//         setPage(1);
//     }, [pageSize]);

//     useEffect(() => {
//         fetchBrands();
//     }, []);

//     //totalPages จำนวนหน้าทั้งหมด
//     const totalPages = Math.max(1, Math.ceil(members.length / pageSize)); // จำนวนหน้าทั้งหมด (อย่างน้อย 1)
//     //currentPage คือหน้าปัจจุบันที่ปลอดภัย
//     const currentPage = Math.min(page, totalPages); // กันหน้าเกินเมื่อข้อมูลลดลง
//     //startIdx คือตำแหน่งเริ่มต้นใน array
//     const startIdx = (currentPage - 1) * pageSize; // index เริ่มต้นของหน้านี้
//     //paged คือรายชื่อเฉพาะหน้านี้
//     const paged = useMemo(
//         () => members.slice(startIdx, startIdx + pageSize), // ตัดเฉพาะแถวของหน้านี้
//         [members, startIdx, pageSize]
//     );
//     //from และ to คือตัวเลขสำหรับข้อความ "แสดง X–Y จาก Z ผู้ใช้
//     const from = members.length === 0 ? 0 : startIdx + 1; // ลำดับแถวแรกที่แสดง
//     const to = Math.min(startIdx + pageSize, members.length); // ลำดับแถวสุดท้ายที่แสดง


//     return (
//         <div className="space-y-5">
//             <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
//                 <h1 className="text-xl font-bold text-stone-900 ">Admin Management</h1>
//             </header>

//             <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white ">
//                 <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
//                     <h2 className="text-base font-bold text-stone-900 sm:text-lg">Admin ร้านค้า</h2>
//                     {!loading && !error && (
//                         <span className="text-sm text-stone-500">
//                             ทั้งหมด {formatNumber(members.length)} รายการ
//                         </span>
//                     )}
//                 </div>

//                 {loading && <p className="px-8 py-10 text-center text-stone-500">กำลังโหลด...</p>}
//                 {error && <p className="px-8 py-10 text-center text-red-600">{error}</p>}

//                 {/* Desktop */}
//                 {!loading && !error && (
//                     <>
//                         <div className="hidden overflow-x-auto md:block">
//                             <table className="w-full text-left text-sm">
//                                 <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
//                                     <tr>
//                                         <th scope="col" className="px-8 py-4 font-normal">ผู้ดูแล</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">ร้านค้า</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">อีเมล</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">บทบาท</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">วันที่สมัคร</th>
//                                         <th scope="col" className="px-4 py-4 font-normal">สถานะ</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-stone-100">
//                                     {members.length === 0 ? (
//                                         <tr>
//                                             <td colSpan={6} className="px-8 py-10 text-center text-stone-500">
//                                                 ไม่พบข้อมูล
//                                             </td>
//                                         </tr>
//                                     ) : (
//                                         paged.map((m) => (
//                                             <tr key={m.id} className="text-stone-800">
//                                                 <td className="px-8 py-4">{m.name}</td>
//                                                 <td className="px-4 py-4">{m.brand_name}</td>
//                                                 <td className="px-4 py-4">{m.email ?? "-"}</td>
//                                                 <td className="px-4 py-4"><RoleBadge role={m.role} /></td>
//                                                 <td className="px-4 py-4">
//                                                     {new Date(m.created_at).toLocaleDateString("th-TH")}
//                                                 </td>
//                                                 <td className="px-4 py-4"><StatusBadge status={m.brand_status} /></td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                         <ul className="divide-y divide-stone-100 md:hidden">
//                             {members.length === 0 ? (
//                                 <li className="px-4 py-10 text-center text-stone-500">ไม่พบข้อมูล</li>
//                             ) : (
//                                 members.map((m) => (
//                                     <li key={m.id} className="space-y-1 px-4 py-4 text-sm text-stone-800">
//                                         <div className="flex items-center justify-between gap-2">
//                                             <span className="font-medium">{m.name}</span>
//                                             <RoleBadge role={m.role} />
//                                         </div>
//                                         <p className="text-stone-600">{m.brand_name}</p>
//                                         <p className="text-stone-500">{m.email ?? "-"}</p>
//                                         <p className="text-xs text-stone-400">
//                                             {new Date(m.created_at).toLocaleDateString("th-TH")}
//                                         </p>
//                                         <div className="flex items-center gap-1.5">
//                                             <StatusBadge status={m.brand_status} />
//                                         </div>
//                                     </li>
//                                 ))
//                             )}
//                         </ul>

//                         <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
//                             <p className="text-sm text-stone-500">
//                                 แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(members.length)} รายการ
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

//                                 <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-admin-100 px-3 text-sm font-medium text-admin-800">
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