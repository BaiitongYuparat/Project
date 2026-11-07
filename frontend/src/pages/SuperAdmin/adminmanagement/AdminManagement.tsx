import { useEffect, useState } from "react";
import { getBrands } from "../../../services/SuperAdmin/brandService";
import type { Brand } from "../../../types/brand";

//แปลงตัวเลขเป็นรูปแบบไทย
const formatNumber = (n: number) => n.toLocaleString("th-TH");

export default function AdminManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError(null);
      setBrands(await getBrands());
    } catch (err) {
      console.error("Failed to fetch brands:", err);
      setError("ไม่สามารถโหลดข้อมูล Admin ร้านค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">Admin Management</h1>
      </header>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white ">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
          <h2 className="text-lg font-bold text-stone-900 sm:text-xl">Admin ร้านค้า </h2>
          {!loading && !error && (
            <span className="text-sm text-stone-500">
              ทั้งหมด {formatNumber(brands.length)} รายการ
            </span>
          )}
        </div>

        {loading && <p className="px-8 py-10 text-center text-stone-500">กำลังโหลด...</p>}
        {error && <p className="px-8 py-10 text-center text-red-600">{error}</p>}

        {/* Desktop */}
        {!loading && !error && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="border-y border-stone-200 bg-stone-50 text-sm text-stone-500">
                <tr>
                  <th scope="col" className="px-8 py-4 font-normal">ผู้ดูแล</th>
                  <th scope="col" className="px-4 py-4 font-normal">ร้านค้า</th>
                  <th scope="col" className="px-4 py-4 font-normal">อีเมล</th>
                  <th scope="col" className="px-4 py-4 font-normal">วันที่สมัคร</th>
                  <th scope="col" className="px-8 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-stone-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  brands.map((b) => (
                    <tr key={b.id} className="text-stone-800">
                      <td className="px-8 py-4">{b.owner_name}</td>
                      <td className="px-4 py-4">{b.brand_name}</td>
                      <td className="px-4 py-4">{b.email ?? "-"}</td>
                      <td className="px-4 py-4">
                        {new Date(b.created_at).toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}