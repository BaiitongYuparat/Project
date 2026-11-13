import { useState } from "react";
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
import { useCachedQuery } from "../../hooks/useCachedQuery";
import type { BrandSizeChart, ProductGender } from "../../types/product";

const GENDER_LABELS: Record<ProductGender, string> = {
  UNISEX: "ทุกเพศ",
  MALE: "ชาย",
  FEMALE: "หญิง",
};

export default function SizeChartManagement() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // รายการตารางไซส์ — มี cache แสดงทันที (skeleton เฉพาะครั้งแรกที่ไม่มี cache)
  const {
    data,
    loading,
    error: loadError,
    refresh,
  } = useCachedQuery<BrandSizeChart[]>(
    slug ?? null,
    (opts) =>
      slug
        ? getBrandSizeCharts(slug, opts)
        : Promise.reject(new Error("Missing brand slug")),
  );

  const charts = data ?? [];

  const [actionError, setActionError] = useState("");

  const handleDelete = async (chart: BrandSizeChart) => {
    if (!slug) return;

    const confirmed = window.confirm(
      `คุณต้องการลบตารางไซส์ "${chart.name}" ใช่หรือไม่?`,
    );

    if (!confirmed) return;

    try {
      setActionError("");
      // service invalidate cache ให้เอง — force refresh ให้ list อัปเดตทันที
      await deleteBrandSizeChart(slug, chart.id);
      await refresh({ force: true });
    } catch (err) {
      console.error("Delete size chart error:", err);
      setActionError(
        isAxiosError(err)
          ? err.response?.data?.message ?? "ไม่สามารถลบตารางไซส์ได้"
          : "ไม่สามารถลบตารางไซส์ได้",
      );
    }
  };

  const displayError =
    actionError || (loadError ? "ไม่สามารถโหลดตารางไซส์ได้" : "");

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3B2C25] text-xl text-[#F5EFE3] shadow-sm sm:flex"
              aria-hidden
            >
              <IonIcon icon={resizeOutline} />
            </span>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[#332F29] sm:text-3xl">
                Size Chart Management
              </h1>

              <p className="mt-2 text-sm text-[#8B806E] sm:text-base">
                สร้างตารางไซส์ของร้านไว้ใช้กับสินค้าได้หลายตัว —
                แก้ตารางครั้งเดียว สินค้าที่อ้างอิงเปลี่ยนตาม
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => navigate("new")}
            >
              <IonIcon icon={addOutline} className="text-sm md:text-md" />
              เพิ่มตาราง
            </Button>
          </div>
        </div>

        {/* Error */}
        {displayError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {displayError}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-2xl border border-[#E9DFC9] bg-white"
              />
            ))}
          </div>
        ) : charts.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#DCCFB8] bg-white text-[#A39988]">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FCFAF6] text-3xl text-[#87947A]"
              aria-hidden
            >
              <IonIcon icon={resizeOutline} />
            </span>

            <p className="mt-4 text-base font-medium text-[#786E5D]">
              ยังไม่มีตารางไซส์
            </p>

            <p className="mt-1 text-sm">
              สร้างตารางไซส์แรกเพื่อใช้กับสินค้าของร้านคุณ
            </p>

            <button
              type="button"
              onClick={() => navigate("new")}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[#3B2C25] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2A201B]"
            >
              <IonIcon icon={addOutline} />
              สร้างตารางแรกของคุณ
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {charts.map((chart) => (
              <div
                key={chart.id}
                className="group flex flex-col rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#DCCFB8] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#332F29]">
                      {chart.name}
                    </p>

                    <p className="mt-1 text-xs text-[#8B806E]">
                      {GENDER_LABELS[chart.gender]}
                      {chart.entries.length > 0 &&
                        ` · ${chart.entries.length} หมวดหมู่`}
                    </p>
                  </div>

                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FCFAF6] text-[#6B7A5E] transition-colors group-hover:bg-[#3B2C25] group-hover:text-[#F5EFE3]"
                    aria-hidden
                  >
                    <IonIcon icon={resizeOutline} />
                  </span>
                </div>

                {/* Category + size chips preview */}
                <div className="mt-4 flex-1 space-y-2.5">
                  {chart.entries.map((entry) => (
                    <div key={entry.id}>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#A39988]">
                        {entry.category}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.rows.length > 0 ? (
                          entry.rows.map((row) => (
                            <span
                              key={row.id}
                              className="rounded-md bg-[#FCFAF6] px-2 py-0.5 text-xs font-medium text-[#786E5D]"
                            >
                              {row.size || "—"}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#A39988]">
                            ยังไม่มีไซส์
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      chart.product_count
                        ? "bg-[#F2F4EC] text-[#6B7A5E]"
                        : "bg-[#FCFAF6] text-[#A39988]"
                    }`}
                  >
                    {chart.product_count
                      ? `ใช้โดยสินค้า ${chart.product_count} ตัว`
                      : "ยังไม่มีสินค้าใช้อ้างอิง"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F0E8DA] pt-4">
                  <Link
                    to={`${chart.id}/edit`}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-[#6B7A5E] transition-colors hover:bg-[#F2F4EC]"
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
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
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
    </div>
  );
}
