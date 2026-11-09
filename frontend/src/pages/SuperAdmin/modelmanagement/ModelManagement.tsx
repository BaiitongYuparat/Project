import { useEffect, useMemo, useState } from "react";
import { getModels } from "../../../services/SuperAdmin/modelService";
import type { Model } from "../../../types/model";

const formatNumber = (n: number) => n.toLocaleString("th-TH");

function StatCard({ title, value, caption }: { title: string; value: number; caption: string }) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">{title}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{formatNumber(value)}</p>
            <p className="mt-1 text-xs text-stone-500">{caption}</p>
        </div>
    );
}

export default function ModelManagement() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<Model[]>([]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            setError(null);
            setModels(await getModels());
        } catch (err) {
            console.error("Failed to fetch models:", err);
            setError("ไม่สามารถโหลดข้อมูลโมเดลได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const stats = useMemo(
        () => ({
            total: models.length,
            selectable: models.filter((m) => m.is_selectable).length,
            inactive: models.filter((m) => !m.is_active).length,
            active: models.filter((m) => m.is_active).length,
        }),
        [models]
    );



    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-bold text-stone-900">Model Management</h1>
                
            </header>

            {error && (
                <p className="text-center text-red-600">
                    {error}{" "}
                    <button type="button" onClick={fetchModels} className="text-blue-700 underline">
                        ลองใหม่
                    </button>
                </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="โมเดลทั้งหมด" value={loading ? 0 : stats.total} caption="โมเดลในระบบทั้งหมด" />
                <StatCard title="เปิดให้ลูกค้าเลือก" value={loading ? 0 : stats.selectable} caption="ลูกค้าเลือกใช้ได้" />
                <StatCard title="ปิดอยู่" value={loading ? 0 : stats.inactive} caption="โมเดลที่ปิดใช้งาน" />
                <StatCard title="เปิดใช้งาน" value={loading ? 0 : stats.active} caption="โมเดลที่เปิดใช้งาน" />
            </div>
        </div>
    );
}