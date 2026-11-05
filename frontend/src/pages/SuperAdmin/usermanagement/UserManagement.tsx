import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, deleteUserById } from "../../../services/userService";
import type { User } from "../../../types/user";

const formatNumber = (n: number) => n.toLocaleString("th-TH");

function GenderBadge({ gender }: { gender?: string | null }) {
  const g = (gender ?? "").toLowerCase();
  const style =
    g === "male"
      ? "bg-blue-50 text-blue-700"
      : g === "female"
      ? "bg-pink-50 text-pink-700"
      : "bg-stone-100 text-stone-600";
  const label = g === "male" ? "ชาย" : g === "female" ? "หญิง" : gender || "-";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${style}`}>
      {label}
    </span>
  );
}

function RowActions({ user, onDelete }: { user: User; onDelete: (u: User) => void }) {
  return (
    <div className="flex items-center justify-end gap-4 text-sm">
      <Link to={`/users/${user.id}/edit`} className="text-blue-700 hover:underline">
        แก้ไข
      </Link>
      <button
        type="button"
        onClick={() => onDelete(user)}
        className="text-red-600 hover:underline"
      >
        ระงับ
      </button>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

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

  const handleDelete = async (user: User) => {
    if (!window.confirm(`ต้องการลบ "${user.name}" ใช่หรือไม่?`)) return;
    try {
      await deleteUserById(String(user.id));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("ไม่สามารถลบผู้ใช้ได้");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);



  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchGender =
        filter === "ALL" || (u.gender ?? "").toLowerCase() === filter;
      const matchQuery =
        !q ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);
      return matchGender && matchQuery;
    });
  }, [users, query, filter]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">User Management</h1>
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
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
          <h2 className="text-lg font-bold text-stone-900 sm:text-xl">รายชื่อผู้ใช้</h2>
          <span className="text-stone-500">{formatNumber(visible.length)} คน</span>
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
              {visible.map((user) => (
                <li key={user.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{user.name}</p>
                      <p className="break-all text-sm text-stone-500">{user.email ?? "-"}</p>
                    </div>
                    <GenderBadge gender={user.gender} />
                  </div>
                  <div className="mt-3">
                    <RowActions user={user} onDelete={handleDelete} />
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-y border-stone-200 bg-stone-50 text-sm text-stone-500">
                  <tr>
                    <th scope="col" className="px-8 py-4 font-normal">ผู้ใช้</th>
                    <th scope="col" className="px-4 py-4 font-normal">อีเมล</th>
                    <th scope="col" className="px-4 py-4 font-normal">เพศ</th>
                    <th scope="col" className="px-8 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-8 py-4 font-medium text-stone-900">{user.name}</td>
                      <td className="break-all px-4 py-4 text-stone-600">{user.email ?? "-"}</td>
                      <td className="px-4 py-4">
                        <GenderBadge gender={user.gender} />
                      </td>
                      <td className="px-8 py-4">
                        <RowActions user={user} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}