import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
  cashOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
} from "ionicons/icons";

import {
  getAiReports,
  updateAiReportStatus,
} from "../../../services/SuperAdmin/aiReportService";
import type {
  AiReport,
  AiReportCategory,
  AiReportStatus,
} from "../../../types/aiReport";
import { fetchPendingCounts } from "../../../store/pendingRequestsSlice";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/Button";

const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

// ประเภทปัญหาเดียว — ภาพที่ AI สร้างผิดพลาด
const CATEGORY_LABEL: Record<AiReportCategory, string> = {
  TRY_ON: "ภาพที่ AI สร้างผิดพลาด",
};

const STATUS_LABEL: Record<AiReportStatus, string> = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว (คืนเครดิต)",
  REJECTED: "ไม่อนุมัติ",
};

const TABS: Array<{ key: AiReportStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอตรวจสอบ" },
  { key: "APPROVED", label: "อนุมัติแล้ว" },
  { key: "REJECTED", label: "ไม่อนุมัติ" },
];

function StatusBadge({ status }: { status: AiReportStatus }) {
  const map: Record<AiReportStatus, { className: string }> = {
    PENDING: { className: "bg-amber-50 text-amber-700 ring-amber-200" },
    APPROVED: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    REJECTED: { className: "bg-rose-50 text-rose-700 ring-rose-200" },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function CategoryBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
      {CATEGORY_LABEL.TRY_ON}
    </span>
  );
}
export default function AiReports() {
  const dispatch = useDispatch<AppDispatch>();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AiReportStatus | "ALL">("PENDING");
  const [query, setQuery] = useState("");

  // Modal รายละเอียด + จัดการสถานะ
  const [selected, setSelected] = useState<AiReport | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Toast แจ้งความสำเร็จ
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // setState ทั้งหมดอยู่ใน async callback (.then/.catch) ตาม react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;

    getAiReports()
      .then((data) => {
        if (cancelled) return;
        setReports(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch AI reports:", err);
        setError("ไม่สามารถโหลดรายงานได้");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const retryLoad = () => {
    setLoading(true);
    getAiReports()
      .then((data) => {
        setReports(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch AI reports:", err);
        setError("ไม่สามารถโหลดรายงานได้");
        setLoading(false);
      });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchTab = tab === "ALL" || report.status === tab;
      const name = (report.user.name ?? "").toLowerCase();
      const matchQuery =
        !q ||
        name.includes(q) ||
        report.user.email.toLowerCase().includes(q) ||
        report.message.toLowerCase().includes(q);
      return matchTab && matchQuery;
    });
  }, [reports, tab, query]);

  const pendingCount = useMemo(
    () => reports.filter((r) => r.status === "PENDING").length,
    [reports]
  );

  const openDetail = (report: AiReport) => {
    setSelected(report);
    setAdminNote(report.admin_note ?? "");
    setSaveError(null);
  };

  const handleUpdateStatus = async (status: AiReportStatus) => {
    if (!selected) return;

    if (status === "APPROVED") {
      const label = selected.user.name ?? selected.user.email;
      if (
        !window.confirm(
          `ยืนยันอนุมัติรายการของ ${label}?\nระบบจะคืนเครดิต 1 เครดิตให้ผู้ใช้`
        )
      ) {
        return;
      }
    }

    try {
      setSaving(true);
      setSaveError(null);
      const updated = await updateAiReportStatus(
        selected.id,
        status,
        adminNote.trim()
      );
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setSelected(updated);
      setAdminNote(updated.admin_note ?? "");
      // badge ใน sidebar อัปเดตทันที
      dispatch(fetchPendingCounts());
      showToast(
        status === "APPROVED"
          ? "อนุมัติแล้ว — คืน 1 เครดิตให้ผู้ใช้เรียบร้อย"
          : `อัปเดตสถานะเป็น "${STATUS_LABEL[status]}" เรียบร้อย`
      );
    } catch (err: unknown) {
      console.error("[AI Report] update status failed:", err);
      const data =
        err && typeof err === "object" && "response" in err
          ? (
              err as {
                response?: { data?: { error?: string; message?: string } };
              }
            ).response?.data
          : undefined;
      setSaveError(data?.error ?? data?.message ?? "บันทึกสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            รายงานภาพที่ AI สร้างผิดพลาด
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            รับเรื่องจาก shopper ตรวจสอบ แล้วกดอนุมัติเพื่อคืนเครดิต 1 เครดิตให้ผู้ใช้
          </p>
        </div>
      </header>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${
                tab === t.key
                  ? "bg-admin-600 text-white"
                  : "bg-white text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {t.label}
              {t.key === "PENDING" && pendingCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${
                    tab === t.key
                      ? "bg-white text-stone-800"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
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
            placeholder="ค้นหาชื่อ อีเมล หัวข้อ หรือหมวดหมู่"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
          <h2 className="text-base font-bold text-stone-900 sm:text-lg">
            รายการรายงาน
          </h2>
          <span className="text-sm text-stone-500">
            {visible.length.toLocaleString("th-TH")} รายการ
          </span>
        </div>

        {loading && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
            กำลังโหลด...
          </div>
        )}

        {!loading && error && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-red-600">
            {error}{" "}
            <button
              type="button"
              onClick={retryLoad}
              className="text-stone-700 underline"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
            {reports.length === 0
              ? "ยังไม่มีรายงาน"
              : "ไม่พบรายงานที่ตรงกับเงื่อนไข"}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            {/* Mobile */}
            <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
              {visible.map((report) => (
                <li key={report.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {report.user.name ?? report.user.email}
                      </p>
                      <p className="break-all text-xs text-stone-500">
                        {report.user.email}
                      </p>
                      <p className="mt-1 truncate text-sm text-stone-700">
                        {report.message}
                      </p>
                      <div className="mt-2">
                        <CategoryBadge />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={report.status} />
                      {report.image_url && (
                        <span className="text-xs text-stone-400">มีภาพแนบ</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-stone-400">
                      {formatDateTime(report.created_at)}
                    </span>
                    <Button
                      size="sm"
                      variant="cream-outline"
                      onClick={() => openDetail(report)}
                    >
                      ดูรายละเอียด
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th scope="col" className="px-8 py-4 font-normal">
                      ผู้รายงาน
                    </th>
                    <th scope="col" className="px-4 py-4 font-normal">
                      รายละเอียด
                    </th>
                    <th scope="col" className="px-4 py-4 font-normal">
                      วันที่รายงาน
                    </th>
                    <th scope="col" className="px-4 py-4 font-normal">
                      สถานะ
                    </th>
                    <th scope="col" className="px-8 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-stone-100 hover:bg-stone-50"
                    >
                      <td className="px-8 py-4">
                        <p className="font-medium text-stone-900">
                          {report.user.name ?? "-"}
                        </p>
                        <p className="break-all text-xs text-stone-500">
                          {report.user.email}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <p className="truncate text-stone-700">{report.message}</p>
                        {report.image_url && (
                          <p className="mt-0.5 text-xs text-stone-400">มีภาพแนบ</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-stone-600">
                        {formatDateTime(report.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={
                              report.status === "PENDING" ? "primary" : "outline"
                            }
                            onClick={() => openDetail(report)}
                          >
                            ดูรายละเอียด
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Detail / Status Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !saving && setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-stone-900">
                  {CATEGORY_LABEL.TRY_ON}
                </h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  {selected.user.name ?? "-"} · {selected.user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={saving}
                aria-label="ปิดหน้าต่าง"
                className="rounded-lg p-1.5 text-2xl text-stone-500 hover:bg-stone-100 disabled:opacity-40"
              >
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selected.status} />
                <CategoryBadge />
              </div>

              {/* ข้อมูลการคืนเครดิต */}
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <IonIcon icon={cashOutline} className="mt-0.5 text-lg" />
                <p>
                  {selected.status === "APPROVED" ? (
                    <>
                      อนุมัติแล้ว — คืนเครดิต 1 เครดิตให้ผู้ใช้เรียบร้อย
                    </>
                  ) : (
                    <>
                      หากกด <span className="font-semibold">ยอมรับ</span>{" "}
                      ระบบจะคืนเครดิต <span className="font-semibold">1 เครดิต</span>{" "}
                      ให้ผู้ใช้
                    </>
                  )}
                </p>
              </div>

              <div className="mt-3 grid gap-1 text-sm text-stone-500">
                <p>
                  รายงานเมื่อ:{" "}
                  <span className="text-stone-700">
                    {formatDateTime(selected.created_at)}
                  </span>
                </p>
                {selected.handled_at && (
                  <p>
                    อัปเดตล่าสุด:{" "}
                    <span className="text-stone-700">
                      {formatDateTime(selected.handled_at)}
                    </span>
                  </p>
                )}
                {selected.page_url && (
                  <p>
                    หน้าที่พบปัญหา:{" "}
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-700">
                      {selected.page_url}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  รายละเอียดจากผู้ใช้
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                  {selected.message}
                </p>
              </div>

              {selected.image_url && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    ภาพหน้าจอประกอบ
                  </p>
                  <a
                    href={selected.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl ring-1 ring-stone-200"
                  >
                    <img
                      src={selected.image_url}
                      alt="ภาพหน้าจอจากผู้ใช้"
                      className="max-h-64 w-full object-contain"
                    />
                  </a>
                  <p className="mt-1 text-xs text-stone-400">
                    คลิกที่ภาพเพื่อเปิดขนาดเต็ม (ลิงก์หมดอายุใน 24 ชั่วโมง)
                  </p>
                </div>
              )}

              <div className="mt-4">
                <label
                  htmlFor="ai-report-admin-note"
                  className="mb-1 block text-sm font-medium text-stone-700"
                >
                  บันทึกภายใน{" "}
                  <span className="font-normal text-stone-400">
                    (ใช้บันทึกการตรวจสอบ/วิธีแก้ ไม่แสดงให้ผู้ใช้เห็น)
                  </span>
                </label>
                <textarea
                  id="ai-report-admin-note"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="เช่น ตรวจสอบแล้วเกิดจาก API timeout, แก้ไข prompt แล้ว"
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
              </div>

              {saveError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {saveError}
                </p>
              )}
            </div>

            {/* Footer actions — ยอมรับแล้วบันทึกทีเดียว */}
            <div className="flex flex-col gap-2 border-t border-stone-200 px-6 py-4 sm:flex-row">
              {selected.status === "PENDING" ? (
                <>
                  <Button
                    variant="cream-outline"
                    className="flex-1"
                    disabled={saving}
                    onClick={() => handleUpdateStatus("REJECTED")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IonIcon icon={closeCircleOutline} />
                      ปฏิเสธ
                    </span>
                  </Button>
                  <Button
                    variant="cream"
                    className="flex-1"
                    disabled={saving}
                    onClick={() => handleUpdateStatus("APPROVED")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IonIcon icon={checkmarkCircleOutline} />
                      ยอมรับ &amp; คืนเครดิต
                    </span>
                  </Button>
                </>
              ) : selected.status === "APPROVED" ? (
                <Button
                  variant="cream-outline"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => handleUpdateStatus("REJECTED")}
                >
                  เปลี่ยนเป็นไม่อนุมัติ
                </Button>
              ) : (
                <Button
                  variant="cream"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => handleUpdateStatus("APPROVED")}
                >
                  <span className="inline-flex items-center gap-2">
                    <IonIcon icon={checkmarkCircleOutline} />
                    อนุมัติ &amp; คืนเครดิต
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
