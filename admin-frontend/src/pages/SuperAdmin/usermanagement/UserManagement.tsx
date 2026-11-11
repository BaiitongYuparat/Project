import { useEffect, useMemo, useState } from "react";
import { getUsers, deleteUser, updateUserStatus } from "../../../services/userService";
import type { User } from "../../../types/user";
import Button from "../../../components/Button";

const formatNumber = (n: number) => n.toLocaleString("th-TH");

type GenderKey = "male" | "female" | "other";

const GENDER_LABEL: Record<GenderKey, { label: string; className: string }> = {
    male: { label: "ชาย", className: "bg-sky-50 text-sky-700 ring-sky-200" },
    female: { label: "หญิง", className: "bg-pink-50 text-pink-700 ring-pink-200" },
    other: { label: "-", className: "bg-stone-100 text-stone-600 ring-stone-200" },
};

const USER_ROLE_LABEL: Record<"USER", { label: string; className: string }> = {
    USER: { label: "ผู้ใช้", className: "bg-stone-100 text-stone-600 ring-stone-200" },
};


function GenderBadge({ gender }: { gender?: string | null }) {
    const g = (gender ?? "").toLowerCase();
    const key: GenderKey = g === "male" || g === "female" ? g : "other";
    const s = GENDER_LABEL[key];
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
            {key === "other" ? gender || s.label : s.label}
        </span>
    );
}

function RoleBadge() {
    // ตาราง User เหลือเฉพาะ shopper — บัญชีผู้ดูแลอยู่ตาราง Admin (แยกตาราง/หน้า login)
    const s = USER_ROLE_LABEL.USER;
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${s.className}`}>
            {s.label}
        </span>
    );
}

function StatusBadge({ status }: { status?: string | null }) {
    const suspended = status === "suspended";
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${suspended
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                }`}
        >
            {suspended ? "ถูกระงับ" : "ใช้งานปกติ"}
        </span>
    );
}

//จำนวนหน้าที่กำหนดให้แสดง
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [genderFilter, setGenderFilter] = useState<"ALL" | GenderKey>("ALL");


    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);



    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            setUsers(await getUsers());
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError("ไม่สามารถโหลดข้อมูล user ได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [query, genderFilter, pageSize]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users.filter((u) => {
            const g = (u.gender ?? "").toLowerCase();
            const genderKey: GenderKey = g === "male" || g === "female" ? g : "other";

            const matchGender = genderFilter === "ALL" || genderKey === genderFilter;
            const matchQuery =
                !q ||
                (u.name ?? "").toLowerCase().includes(q) ||
                (u.email ?? "").toLowerCase().includes(q);
            return matchGender && matchQuery;
        });
    }, [users, query, genderFilter]);

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


    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const handleAction = async (type: "suspend" | "unsuspend" | "delete", user: User) => {
        try {
            setActionLoadingId(user.id);

            if (type === "delete") {
                await deleteUser(user.id);
                setUsers((prev) => prev.filter((u) => u.id !== user.id));
                console.log(`[User] deleted: ${user.email}`);
            } else {
                const status = type === "suspend" ? "suspended" : "active";
                await updateUserStatus(user.id, status);
                setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status } : u)));
                console.log(`[User] ${status}: ${user.email}`);
            }
        } catch (err: any) {
            console.error(
                "[User] action failed:",
                err?.response?.data?.error ?? err?.response?.data?.message ?? err
            );
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-bold text-stone-900 ">User Management</h1>
            </header>


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
                        placeholder="ค้นหาชื่อ หรืออีเมลผู้ใช้"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                </div>
                <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as "ALL" | GenderKey)}
                    aria-label="กรองตามเพศ"
                    className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 sm:w-44"
                >
                    <option value="ALL">เพศ: ทั้งหมด</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่นๆ / ไม่ระบุ</option>
                </select>

            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
                    <h2 className="text-base font-bold text-stone-900 sm:text-lg">รายชื่อผู้ใช้</h2>
                    <span className="text-sm text-stone-500">{formatNumber(visible.length)} คน</span>
                </div>

                {loading && (
                    <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
                        กำลังโหลด...
                    </div>
                )}

                {!loading && error && (
                    <div className="border-t border-stone-200 px-4 py-10 text-center text-red-600">
                        {error}{" "}
                        <button type="button" onClick={fetchUsers} className="text-blue-700 underline">
                            ลองใหม่
                        </button>
                    </div>
                )}

                {!loading && !error && visible.length === 0 && (
                    <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
                        {users.length === 0 ? "ยังไม่มีผู้ใช้" : "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข"}
                    </div>
                )}

                {!loading && !error && visible.length > 0 && (
                    <>
                        {/* Mobile */}
                        <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
                            {paged.map((user) => (
                                <li key={user.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
                                            <p className="break-all text-xs text-stone-500">{user.email ?? "-"}</p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <GenderBadge gender={user.gender} />
                                            <RoleBadge />
                                        </div>

                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <StatusBadge status={user.status} />
                                        <div className="ml-auto flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={user.status === "suspended" ? "secondary" : "outline"}
                                                disabled={actionLoadingId === user.id}
                                                onClick={() =>
                                                    handleAction(user.status === "suspended" ? "unsuspend" : "suspend", user)
                                                }
                                            >
                                                {user.status === "suspended" ? "ปลดระงับ" : "ระงับ"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                disabled={actionLoadingId === user.id}
                                                onClick={() => handleAction("delete", user)}
                                            >
                                                ลบ
                                            </Button>
                                        </div>
                                    </div>

                                </li>
                            ))}
                        </ul>

                        {/* Desktop */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
                                    <tr>
                                        <th scope="col" className="px-8 py-4 font-normal">ผู้ใช้</th>
                                        <th scope="col" className="px-4 py-4 font-normal">อีเมล</th>
                                        <th scope="col" className="px-4 py-4 font-normal">เพศ</th>
                                        <th scope="col" className="px-4 py-4 font-normal">บทบาท</th>
                                        <th scope="col" className="px-8 py-4" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.map((user) => (
                                        <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50">
                                            <td className="px-8 py-4 font-medium text-stone-900">{user.name}</td>
                                            <td className="break-all px-4 py-4 text-stone-600">{user.email ?? "-"}</td>
                                            <td className="px-4 py-4">
                                                <GenderBadge gender={user.gender} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <RoleBadge />
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge status={user.status} />
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={user.status === "suspended" ? "secondary" : "outline"}
                                                        disabled={actionLoadingId === user.id}
                                                        onClick={() =>
                                                            handleAction(user.status === "suspended" ? "unsuspend" : "suspend", user)
                                                        }
                                                    >
                                                        {user.status === "suspended" ? "ปลดระงับ" : "ระงับ"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="danger"
                                                        disabled={actionLoadingId === user.id}
                                                        onClick={() => handleAction("delete", user)}
                                                    >
                                                        ลบ
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-stone-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8">
                            <p className="text-sm text-stone-500">
                                แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(visible.length)} ผู้ใช้
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