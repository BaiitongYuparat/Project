import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { IonIcon } from "@ionic/react";
import {
  addOutline,
  createOutline,
  resizeOutline,
  trashOutline,
} from "ionicons/icons";

import Button from "../../components/Button";

import {
  deleteBrandSizeChart,
  getBrandSizeCharts,
} from "../../services/ShopAdmin/sizeChartService";
import type { BrandSizeChart, ProductGender } from "../../types/product";

const GENDER_LABELS: Record<ProductGender, string> = {
  UNISEX: "ทุกเพศ",
  MALE: "ชาย",
  FEMALE: "หญิง",
};

export default function SizeChartManagement() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [charts, setCharts] = useState<BrandSizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCharts = async () => {
    if (!slug) return;

    try {
      setCharts(await getBrandSizeCharts(slug));
      setError("");
    } catch (err) {
      console.error("Load size charts error:", err);
      setError("ไม่สามารถโหลดตารางไซส์ได้");
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // defer ให้ setState อยู่นอก synchronous phase ของ effect
      await Promise.resolve();

      if (cancelled) return;

      await loadCharts();

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleDelete = async (chart: BrandSizeChart) => {
    if (!slug) return;

    const confirmed = window.confirm(
      `คุณต้องการลบตารางไซส์ "${chart.name}" ใช่หรือไม่?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await deleteBrandSizeChart(slug, chart.id);
      loadCharts();
    } catch (err) {
      console.error("Delete size chart error:", err);
      setError(
        isAxiosError(err)
          ? err.response?.data?.message ?? "ไม่สามารถลบตารางไซส์ได้"
          : "ไม่สามารถลบตารางไซส์ได้",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-left text-2xl font-bold text-[#332F29] sm:text-3xl">
            Size Chart Management
          </h1>

          <p className="mt-2 text-base text-[#8B806E]">
            สร้างตารางไซส์ของร้านไว้ใช้กับสินค้าได้หลายตัว —
            แก้ตารางครั้งเดียว สินค้าที่อ้างอิงเปลี่ยนตาม
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("new")}
          >
            <IonIcon icon={addOutline} className="text-sm md:text-md" />
            เพิ่มตาราง
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-sm text-[#8B806E]">
          กำลังโหลดตารางไซส์...
        </div>
      ) : charts.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-[#A39988]">
          <IonIcon icon={resizeOutline} className="text-4xl" />

          <p className="mt-3 text-sm">ยังไม่มีตารางไซส์</p>

          <button
            type="button"
            onClick={() => navigate("new")}
            className="mt-4 rounded-lg bg-[#2453D4] px-4 py-2 text-sm text-white hover:bg-[#1D45B5]"
          >
            สร้างตารางแรกของคุณ
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="flex flex-col rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#332F29]">
                    {chart.name}
                  </p>

                  <p className="mt-1 text-xs text-[#8B806E]">
                    {GENDER_LABELS[chart.gender]} ·{" "}
                    {chart.entries.map((entry) => entry.category).join(", ") ||
                      "ไม่มีหมวดหมู่"}
                  </p>
                </div>

                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FCFAF6] text-[#2453D4]"
                  aria-hidden
                >
                  <IonIcon icon={resizeOutline} />
                </span>
              </div>

              {/* Rows summary per category */}
              <div className="mt-3 flex-1 space-y-1.5">
                {chart.entries.map((entry) => (
                  <p key={entry.id} className="text-xs text-[#786E5D]">
                    <span className="font-medium">{entry.category}:</span>{" "}
                    {entry.rows.map((row) => row.size).join(", ") || "-"}
                  </p>
                ))}
              </div>

              <p className="mt-3 text-xs text-[#A39988]">
                {chart.product_count
                  ? `ถูกใช้โดยสินค้า ${chart.product_count} ตัว`
                  : "ยังไม่มีสินค้าใช้อ้างอิง"}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-[#F0E8DA] pt-4">
                <Link
                  to={`${chart.id}/edit`}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#2453D4] hover:underline"
                >
                  <IonIcon icon={createOutline} className="text-sm" />
                  แก้ไข
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(chart)}
                  disabled={!!chart.product_count}
                  title={
                    chart.product_count
                      ? "ห้ามลบตารางที่มีสินค้าใช้อ้างอิงอยู่"
                      : undefined
                  }
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <IonIcon icon={trashOutline} className="text-sm" />
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
