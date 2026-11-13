import { useEffect, useMemo, useState } from "react";
import {
  getModels,
  setModelStatus,
  deleteModel,
  createModel,
  updateModel,
} from "../../../services/SuperAdmin/modelService";
import type { Model, Gender } from "../../../types/model";
import Switch from "../../../components/Switch";
import Button from "../../../components/Button";
import ConfirmModal from "../../../components/ConfirmModal";
import ModelFormModal from "./ModelFormModal";
import type { ModelFormData } from "../../../types/model";

const formatNumber = (n: number) => n.toLocaleString("th-TH");

/** ดึง error message จาก axios response ถ้ามี */
const getApiError = (err: unknown, fallback: string): string => {
  const response = (err as { response?: { data?: { error?: string } } })
    ?.response;
  return response?.data?.error ?? fallback;
};

const GENDER_LABEL: Record<Gender, string> = {
  MALE: "ชาย",
  FEMALE: "หญิง",
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  ALL: "ทั้งหมด",
  ACTIVE: "เปิด",
  INACTIVE: "ปิด",
};

const PAGE_SIZE_OPTIONS = [8, 12, 24];

function StatCard({
  title,
  value,
  caption,
  accent = false,
}: {
  title: string;
  value: string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-600">{title}</p>
      <p
        className={`mt-1 truncate text-2xl font-bold ${
          accent ? "text-stone-700" : "text-stone-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500">{caption}</p>
    </div>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-medium ring-1 ring-inset ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-stone-100 text-stone-600 ring-stone-200"
      }`}
    >
      {isActive ? "เปิด" : "ปิด"}
    </span>
  );
}

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | Gender>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // โมดัลเพิ่ม/แก้ไข
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ลบ
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState(false);

  // toggle บนการ์ด
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

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
    // fetch แรกตอน mount — loading เริ่ม true อยู่แล้ว จึงไม่ set สถานะแบบ sync
    let cancelled = false;
    (async () => {
      try {
        const data = await getModels();
        if (cancelled) return;
        setModels(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch models:", err);
        setError("ไม่สามารถโหลดข้อมูลโมเดลได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // เปลี่ยนเงื่อนไขฟิลเตอร์/จำนวนต่อหน้า → กลับไปหน้า 1 (ทำใน handler แทน effect)
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleGenderFilterChange = (value: "ALL" | Gender) => {
    setGenderFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const stats = useMemo(
    () => ({
      total: models.length,
      selectable: models.filter((m) => m.is_selectable).length,
      active: models.filter((m) => m.is_active).length,
      inactive: models.filter((m) => !m.is_active).length,
    }),
    [models]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      const matchGender =
        genderFilter === "ALL" || (m.gender ?? "") === genderFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? m.is_active : !m.is_active);
      const matchQuery = !q || m.name.toLowerCase().includes(q);
      return matchGender && matchStatus && matchQuery;
    });
  }, [models, query, genderFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paged = useMemo(
    () => visible.slice(startIdx, startIdx + pageSize),
    [visible, startIdx, pageSize]
  );
  const from = visible.length === 0 ? 0 : startIdx + 1;
  const to = Math.min(startIdx + pageSize, visible.length);

  // ---------- actions ----------

  const handleSubmit = async (data: ModelFormData) => {
    try {
      setFormSaving(true);
      setFormError(null);
      if (editing) {
        const updated = await updateModel(editing.id, data);
        setModels((prev) =>
          prev.map((m) => (m.id === editing.id ? updated : m))
        );
      } else {
        const created = await createModel(data);
        setModels((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      console.error("Failed to save model:", err);
      setFormError(getApiError(err, "ไม่สามารถบันทึกโมเดลได้ กรุณาลองใหม่"));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteModel(deleteTarget.id);
      setModels((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      console.error("[Model] delete failed:", getApiError(err, "ลบโมเดลไม่สำเร็จ"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleSelectable = async (model: Model, checked: boolean) => {
    try {
      setToggleLoadingId(model.id);
      const updated = await setModelStatus(model.id, {
        is_selectable: checked,
      });
      setModels((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    } catch (err: unknown) {
      console.error("[Model] toggle failed:", getApiError(err, "เปลี่ยนสถานะไม่สำเร็จ"));
    } finally {
      setToggleLoadingId(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (model: Model) => {
    setEditing(model);
    setFormError(null);
    setModalOpen(true);
  };

  const chipClass = (selected: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      selected
        ? "bg-admin-600 text-white"
        : "border border-stone-200 bg-white text-stone-600 hover:border-admin-400"
    }`;

  const selectClass =
    "rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300";

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Model Management</h1>
        </div>
        <Button size="md" variant="cream" onClick={openCreate}>
          + เพิ่มโมเดล
        </Button>
      </header>

      {/* การ์ดสรุป */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="โมเดลทั้งหมด"
          value={loading ? "-" : formatNumber(stats.total)}
          caption="โมเดลในระบบทั้งหมด"
        />
        <StatCard
          title="เปิดใช้สำหรับลูกค้า"
          value={loading ? "-" : formatNumber(stats.selectable)}
          caption="ลูกค้าเลือกใช้ใน Try-On ได้"
          accent
        />
        <StatCard
          title="ปิดอยู่"
          value={loading ? "-" : formatNumber(stats.inactive)}
          caption="โมเดลที่ปิดใช้งาน"
        />
      </div>

      {/* ค้นหา + ฟิลเตอร์ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
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
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="ค้นหาชื่อโมเดล"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <select
          value={genderFilter}
          onChange={(e) => handleGenderFilterChange(e.target.value as "ALL" | Gender)}
          aria-label="กรองตามเพศ"
          className={selectClass}
        >
          <option value="ALL">เพศ: ทั้งหมด</option>
          <option value="MALE">ชาย</option>
          <option value="FEMALE">หญิง</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
          aria-label="กรองตามสถานะ"
          className={selectClass}
        >
          <option value="ALL">สถานะ: ทั้งหมด</option>
          <option value="ACTIVE">เปิดใช้งาน</option>
          <option value="INACTIVE">ปิดอยู่</option>
        </select>
        <div className="flex items-center gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleStatusFilterChange(key)}
              className={chipClass(statusFilter === key)}
            >
              {STATUS_FILTER_LABEL[key]}{" "}
              {formatNumber(
                key === "ALL"
                  ? stats.total
                  : key === "ACTIVE"
                    ? stats.active
                    : stats.inactive
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ตารางการ์ดโมเดล */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        {loading && (
          <div className="py-16 text-center text-stone-400">กำลังโหลด...</div>
        )}

        {!loading && error && (
          <div className="py-16 text-center text-red-600">
            {error}{" "}
            <button type="button" onClick={fetchModels} className="text-stone-700 underline">
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="py-16 text-center text-stone-400">
            {models.length === 0
              ? "ยังไม่มีโมเดล "
              : "ไม่พบโมเดลที่ตรงกับเงื่อนไข"}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paged.map((model) => (
                <div
                  key={model.id}
                  className="flex flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
                >
                  {/* รูป */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-stone-100">
                    {model.image_front ? (
                      <img
                        src={model.image_front}
                        alt={model.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-400">
                        ไม่มีรูป
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <ActiveBadge isActive={model.is_active} />
                    </div>
                  </div>

                  {/* ข้อมูล */}
                  <div className="mt-3 flex-1 px-1">
                    <p className="truncate font-semibold text-stone-900">
                      {model.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-stone-500">
                      {model.gender ? GENDER_LABEL[model.gender] : "ไม่ระบุเพศ"} · ไซส์ [
                      {model.supported_sizes.length > 0
                        ? model.supported_sizes.join(", ")
                        : "-"}
                      ] · ส่วนสูง{" "}
                      {model.height === null ? "-" : formatNumber(model.height)} ซม.
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {model.bust === null && model.waist === null && model.hips === null
                        ? "ยังไม่บันทึกซัดส่วน"
                        : `อก ${model.bust ?? "-"} · เอว ${model.waist ?? "-"} · สะโพก ${model.hips ?? "-"}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 px-1 pt-3">
                    <Switch
                      checked={model.is_selectable}
                      onChange={(checked) => handleToggleSelectable(model, checked)}
                      label="เปิดใช้สำหรับลูกค้า"
                      disabled={toggleLoadingId === model.id}
                      color="sage"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(model)}
                        className="rounded-lg px-2 py-1.5 text-sm font-medium text-admin-700 hover:bg-admin-100"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(model)}
                        className="rounded-lg px-2 py-1.5 text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500">
                แสดง {formatNumber(from)}–{formatNumber(to)} จาก{" "}
                {formatNumber(visible.length)} โมเดล
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">ต่อหน้า</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  aria-label="รายการต่อหน้า"
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
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-admin-200 px-3 text-sm font-medium text-admin-800">
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

      {/* โมดัลเพิ่ม/แก้ไข — mount เมื่อเปิดเท่านั้น (key กัน state ค้างระหว่างแก้ไขคนละรายการ) */}
      {modalOpen && (
        <ModelFormModal
          key={editing?.id ?? "create"}
          mode={editing ? "edit" : "create"}
          model={editing}
          loading={formSaving}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => {
            if (formSaving) return;
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {/* ยืนยันการลบ */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="ลบโมเดล"
        message={
          <>
            ยืนยันการลบโมเดล{" "}
            <span className="font-medium">{deleteTarget?.name}</span>?
            <br />
            รูปโมเดลจะถูกลบออกจากระบบด้วย
          </>
        }
        loading={deleting}
        loadingLabel="กำลังลบ..."
        tone="cream"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
