import { useEffect, useState } from "react";

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
export default function AdminManagement() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

    })

    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-bold text-stone-900 ">Model Management</h1>

            </header>

            
        </div>
    )
}