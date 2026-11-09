import { useEffect, useMemo, useState } from "react";
import {
    getProductStats,
    getAdminProducts,
    type AdminProductStats,
    type AdminProductRow,


} from "../../../services/SuperAdmin/productsService";
import Button from "../../../components/Button";

const formatNumber = (n: number) => n.toLocaleString("th-TH");

type ProductQuality = "PASS" | "FAIL" | "REVIEW" | "PENDING";

const QUALITY_BADGE: Record<ProductQuality, { label: string; className: string }> = {
    PASS: { label: "AI ผ่าน", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    FAIL: { label: "AI ไม่ผ่าน", className: "bg-rose-50 text-rose-700 ring-rose-200" },
    REVIEW: { label: "ต้องตรวจโดยคน", className: "bg-amber-50 text-amber-700 ring-amber-200" },
    PENDING: { label: "รอผลตรวจ", className: "bg-stone-50 text-stone-600 ring-stone-200" },
};

function StatCard({ title, value, caption }: { title: string; value: number; caption: string }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">{title}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{formatNumber(value)}</p>
            <p className="mt-1 text-xs text-stone-500">{caption}</p>
        </div>
    );
}

function Badge({ quality }: { quality: ProductQuality }) {
    const b = QUALITY_BADGE[quality];
    return (
        <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${b.className}`}>
            {b.label}
        </span>
    );
}


export default function ProductManagementSU() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<AdminProductStats | null>(null);
    const [products, setProducts] = useState<AdminProductRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [brandFilter, setBrandFilter] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [statsData, productsData] = await Promise.all([
                    getProductStats(),
                    getAdminProducts(),
                ]);
                if (!cancelled) {
                    setStats(statsData);
                    setProducts(productsData);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // รายชื่อร้านสำหรับ dropdown
    const brands = useMemo(
        () => Array.from(new Set(products.map((p) => p.brand.name))).sort(),
        [products]
    );

    // กรองฝั่ง frontend ไปก่อน (ถ้าข้อมูลเยอะค่อยย้ายไป backend)
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            if (brandFilter && p.brand.name !== brandFilter) return false;
            if (!q) return true;
            return (
                p.name.toLowerCase().includes(q) ||
                (p.sku ?? "").toLowerCase().includes(q)
            );
        });
    }, [products, search, brandFilter]);

    const selected = products.find((p) => p.id === selectedId) ?? null;



    return (
        <div className="space-y-5">
            <header className="pb-2 text-left">
                <h1 className="text-xl font-bold text-stone-900">Product Management</h1>
            </header>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="สินค้าทั้งหมด" value={stats?.total ?? 0} caption="สินค้าในระบบทั้งหมด" />
                <StatCard title="AI ผ่าน" value={stats?.pass ?? 0} caption="รูปผ่านการตรวจทุกรูป" />
                <StatCard title="AI ไม่ผ่าน" value={stats?.fail ?? 0} caption="มีรูปไม่ผ่านอย่างน้อย 1 รูป" />
                <StatCard title="ต้องตรวจโดยคน" value={stats?.review ?? 0} caption="AI ไม่แน่ใจ รอแอดมินตรวจ" />
            </div>


            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อสินค้า หรือรหัสสินค้า..."
                    className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-blue-700"
                />
                <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none focus:border-blue-700"
                >
                    <option value="">ร้านค้าทั้งหมด</option>
                    {brands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>
            </div>


            <div className="grid items-start gap-4 xl:grid-cols-[1fr_360px]">
                <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white text-left">
                    <div className="flex items-baseline gap-3 px-6 py-4">
                        <h2 className="text-lg font-bold text-stone-900">รายการสินค้า</h2>
                        <span className="text-sm text-stone-500">{formatNumber(filtered.length)} รายการ</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y border-stone-200 bg-stone-50 text-stone-600">
                                    <th className="px-6 py-3 font-medium">รูป</th>
                                    <th className="px-3 py-3 font-medium">สินค้า</th>
                                    <th className="px-3 py-3 font-medium">ร้านค้า</th>
                                    <th className="px-3 py-3 font-medium">ผลตรวจรูป</th>
                                    <th className="px-3 py-3 font-medium">เปิดให้ Try-On</th>
                                    <th className="px-3 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-stone-500">กำลังโหลด...</td>
                                    </tr>
                                )}

                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-stone-500">ไม่พบสินค้า</td>
                                    </tr>
                                )}

                                {filtered.map((p) => (
                                    <tr
                                        key={p.id}
                                        className={p.id === selectedId ? "bg-blue-50" : "hover:bg-stone-50"}
                                    >
                                        <td className="px-6 py-3">
                                            {p.thumbnail ? (
                                                <img src={p.thumbnail} alt={p.name} className="h-12 w-12 rounded-xl border border-stone-200 object-cover" />
                                            ) : (
                                                <div className="h-12 w-12 rounded-xl border border-stone-200 bg-stone-50" />
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium text-stone-900">{p.name}</p>
                                            <p className="text-xs text-stone-500">SKU {p.sku ?? "-"}</p>
                                        </td>
                                        <td className="px-3 py-3 text-stone-900">{p.brand.name}</td>
                                        <td className="px-3 py-3"><Badge quality={p.quality} /></td>
                                        <td className="px-3 py-3">
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Button variant="outline" size="sm" onClick={() => setSelectedId(p.id)}>
                                                ตรวจสอบ
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ผลตรวจรูปโดย AI */}
                <aside className="rounded-2xl border border-stone-200 bg-white p-6 text-left xl:sticky xl:top-4">
                    <h2 className="text-lg font-bold text-stone-900">ผลตรวจรูปโดย AI</h2>

                    {!selected ? (
                        <p className="mt-4 text-sm text-stone-500">เลือกสินค้าจากตาราง แล้วกด "ตรวจสอบ" เพื่อดูผล</p>
                    ) : (
                        <div className="mt-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-medium text-stone-900">
                                        {selected.name} · SKU {selected.sku ?? "-"}
                                    </p>
                                    <p className="text-sm text-stone-500">{selected.brand.name}</p>
                                </div>
                                <Badge quality={selected.quality} />
                            </div>

                            <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                                {selected.thumbnail ? (
                                    <img src={selected.thumbnail} alt={selected.name} className="h-full w-full object-contain" />
                                ) : (
                                    <span className="text-sm text-stone-500">ไม่มีรูปสินค้า</span>
                                )}
                            </div>
                           
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}