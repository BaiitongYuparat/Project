import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
    getAppeals,
    decideAppeal,
} from "../../../services/SuperAdmin/appealService";
import type { Appeal, AppealStatus } from "../../../types/appeal";
import { fetchPendingCounts } from "../../../store/pendingRequestsSlice";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/Button";
import { IonIcon } from "@ionic/react";
import {
    closeOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
} from "ionicons/icons";

const formatDateTime = (iso?: string | null) =>
    iso
        ? new Date(iso).toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "-";

const TABS: Array<{ key: AppealStatus | "ALL"; label: string }> = [
    { key: "ALL", label: "ทั้งหมด" },
    { key: "PENDING", label: "รอพิจารณา" },
    { key: "APPROVED", label: "อนุมัติแล้ว" },
    { key: "REJECTED", label: "ปฏิเสธแล้ว" },
];

function StatusBadge({ status }: { status: AppealStatus }) {
    const map: Record<AppealStatus, { label: string; className: string }> = {
        PENDING: {
            label: "รอพิจารณา",
            className: "bg-amber-50 text-amber-700 ring-amber-200",
        },
        APPROVED: {
            label: "อนุมัติแล้ว",
            className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        },
        REJECTED: {
            label: "ปฏิเสธแล้ว",
            className: "bg-red-50 text-red-700 ring-red-200",
        },
    };
    const s = map[status] ?? map.PENDING;
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}
        >
            {s.label}
        </span>
    );
}

function AccountStatusBadge({ status }: { status?: string | null }) {
    const suspended = status === "suspended";
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                suspended
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
        >
            {suspended ? "บัญชีถูกระงับ" : "บัญชีปกติ"}
        </span>
    );
}

export default function Appeals() {
    const dispatch = useDispatch<AppDispatch>();
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<AppealStatus | "ALL">("PENDING");
    const [query, setQuery] = useState("");

    // Modal พิจารณาคำร้อง
    const [selected, setSelected] = useState<Appeal | null>(null);
    const [adminNote, setAdminNote] = useState("");
    const [deciding, setDeciding] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);

    // Toast แจ้งความสำเร็จหลังตัดสินคำร้อง
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

    const fetchAppeals = async () => {
        try {
            setLoading(true);
            setError(null);
            setAppeals(await getAppeals());
        } catch (err) {
            console.error("Failed to fetch appeals:", err);
            setError("ไม่สามารถโหลดคำร้องได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppeals();
    }, []);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return appeals.filter((a) => {
            const matchTab = tab === "ALL" || a.status === tab;
            const name = (a.user.name ?? "").toLowerCase();
            const matchQuery =
                !q ||
                name.includes(q) ||
                a.user.email.toLowerCase().includes(q) ||
                a.title.toLowerCase().includes(q);
            return matchTab && matchQuery;
        });
    }, [appeals, tab, query]);

    const pendingCount = useMemo(
        () => appeals.filter((a) => a.status === "PENDING").length,
        [appeals]
    );

    const openDetail = (appeal: Appeal) => {
        setSelected(appeal);
        setAdminNote(appeal.admin_note ?? "");
        setDecisionError(null);
    };

    const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
        if (!selected) return;

        if (decision === "REJECTED" && adminNote.trim().length === 0) {
            setDecisionError("กรุณาระบุเหตุผลในการปฏิเสธ");
            return;
        }

        const userLabel = selected.user.name ?? selected.user.email;
        const confirmMessage =
            decision === "APPROVED"
                ? `ยืนยันการอนุมัติคำร้องของ ${userLabel} ?\nบัญชีของผู้ใช้จะถูกปลดระงับทันที`
                : `ยืนยันการปฏิเสธคำร้องของ ${userLabel} ?`;
        if (!window.confirm(confirmMessage)) return;

        try {
            setDeciding(true);
            setDecisionError(null);
            const updated = await decideAppeal(
                selected.id,
                decision,
                adminNote.trim()
            );
            setAppeals((prev) =>
                prev.map((a) => (a.id === updated.id ? updated : a))
            );
            setSelected(null);
            // ตัดสินแล้ว → ให้ badge ใน sidebar อัปเดตทันที
            dispatch(fetchPendingCounts());
            showToast(
                decision === "APPROVED"
                    ? "อนุมัติและปลดระงับบัญชีเรียบร้อย (ส่งอีเมลแจ้งผลแล้ว)"
                    : "ปฏิเสธคำร้องเรียบร้อย (ส่งอีเมลแจ้งผลแล้ว)"
            );
        } catch (err: unknown) {
            console.error("[Appeal] decision failed:", err);
            const data =
                err && typeof err === "object" && "response" in err
                    ? (
                          err as {
                              response?: {
                                  data?: { error?: string; message?: string };
                              };
                          }
                      ).response?.data
                    : undefined;
            setDecisionError(
                data?.error ?? data?.message ?? "บันทึกผลการพิจารณาไม่สำเร็จ"
            );
        } finally {
            setDeciding(false);
        }
    };

    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold text-stone-900">คำร้องขอปลดระงับ</h1>
                    <p className="mt-1 text-sm text-stone-500">
                        คำร้องจาก shopper ที่ถูกระงับบัญชี — อนุมัติแล้วบัญชีจะถูกปลดระงับอัตโนมัติ
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
                        placeholder="ค้นหาชื่อ อีเมล หรือหัวข้อคำร้อง"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
                    <h2 className="text-base font-bold text-stone-900 sm:text-lg">รายการคำร้อง</h2>
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
                        <button type="button" onClick={fetchAppeals} className="text-stone-700 underline">
                            ลองใหม่
                        </button>
                    </div>
                )}

                {!loading && !error && visible.length === 0 && (
                    <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
                        {appeals.length === 0 ? "ยังไม่มีคำร้อง" : "ไม่พบคำร้องที่ตรงกับเงื่อนไข"}
                    </div>
                )}

                {!loading && !error && visible.length > 0 && (
                    <>
                        {/* Mobile */}
                        <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
                            {visible.map((appeal) => (
                                <li key={appeal.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-stone-900">
                                                {appeal.user.name ?? appeal.user.email}
                                            </p>
                                            <p className="break-all text-xs text-stone-500">
                                                {appeal.user.email}
                                            </p>
                                            <p className="mt-1 truncate text-sm text-stone-700">
                                                {appeal.title}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <StatusBadge status={appeal.status} />
                                            <AccountStatusBadge status={appeal.user.status} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-xs text-stone-400">
                                            {formatDateTime(appeal.created_at)}
                                        </span>
                                        <Button size="sm" variant="cream-outline" onClick={() => openDetail(appeal)}>
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
                                        <th scope="col" className="px-8 py-4 font-normal">ผู้ยื่น</th>
                                        <th scope="col" className="px-4 py-4 font-normal">หัวข้อ</th>
                                        <th scope="col" className="px-4 py-4 font-normal">วันที่ยื่น</th>
                                        <th scope="col" className="px-4 py-4 font-normal">สถานะคำร้อง</th>
                                        <th scope="col" className="px-4 py-4 font-normal">สถานะบัญชี</th>
                                        <th scope="col" className="px-8 py-4" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((appeal) => (
                                        <tr key={appeal.id} className="border-b border-stone-100 hover:bg-stone-50">
                                            <td className="px-8 py-4">
                                                <p className="font-medium text-stone-900">
                                                    {appeal.user.name ?? "-"}
                                                </p>
                                                <p className="break-all text-xs text-stone-500">
                                                    {appeal.user.email}
                                                </p>
                                            </td>
                                            <td className="max-w-xs px-4 py-4">
                                                <p className="truncate text-stone-700">{appeal.title}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-stone-600">
                                                {formatDateTime(appeal.created_at)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge status={appeal.status} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <AccountStatusBadge status={appeal.user.status} />
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant={
                                                            appeal.status === "PENDING"
                                                                ? "primary"
                                                                : "outline"
                                                        }
                                                        onClick={() => openDetail(appeal)}
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

            {/* Detail / Decision Modal */}
            {selected && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => !deciding && setSelected(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-6 py-4">
                            <div className="min-w-0">
                                <h3 className="truncate text-lg font-semibold text-stone-900">
                                    {selected.title}
                                </h3>
                                <p className="mt-0.5 text-sm text-stone-500">
                                    {selected.user.name ?? "-"} · {selected.user.email}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                disabled={deciding}
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
                                <AccountStatusBadge status={selected.user.status} />
                            </div>

                            <div className="mt-3 grid gap-1 text-sm text-stone-500">
                                <p>
                                    ยื่นเมื่อ: <span className="text-stone-700">{formatDateTime(selected.created_at)}</span>
                                </p>
                                {selected.decided_at && (
                                    <p>
                                        พิจารณาเมื่อ:{" "}
                                        <span className="text-stone-700">
                                            {formatDateTime(selected.decided_at)}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                    เหตุผลที่ยื่นคำร้อง
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                                    {selected.message}
                                </p>
                            </div>

                            {selected.status === "PENDING" ? (
                                <div className="mt-4">
                                    <label
                                        htmlFor="stone-note"
                                        className="mb-1 block text-sm font-medium text-stone-700"
                                    >
                                        ข้อความตอบกลับถึงผู้ใช้{" "}
                                        <span className="font-normal text-stone-400">
                                            {selected.status === "PENDING" ? "(บังคับเมื่อปฏิเสธ)" : "(บังคับ)"}
                                        </span>
                                    </label>
                                    <textarea
                                        id="stone-note"
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="เช่น เหตุผลการตัดสิน หรือคำแนะนำในการใช้งานครั้งต่อไป"
                                        className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    />
                                </div>
                            ) : (
                                selected.admin_note && (
                                    <div className="mt-4 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                            ข้อความตอบกลับ
                                        </p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                                            {selected.admin_note}
                                        </p>
                                    </div>
                                )
                            )}

                            {decisionError && (
                                <p className="mt-3 text-sm text-red-600" role="alert">
                                    {decisionError}
                                </p>
                            )}
                        </div>

                        {/* Footer actions */}
                        {selected.status === "PENDING" && (
                            <div className="flex flex-col gap-2 border-t border-stone-200 px-6 py-4 sm:flex-row">
                                <Button
                                    variant="cream-outline"
                                    className="flex-1"
                                    disabled={deciding}
                                    onClick={() => handleDecision("REJECTED")}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <IonIcon icon={closeCircleOutline} />
                                        ปฏิเสธคำร้อง
                                    </span>
                                </Button>
                                <Button
                                    variant="cream"
                                    className="flex-1"
                                    disabled={deciding}
                                    onClick={() => handleDecision("APPROVED")}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <IonIcon icon={checkmarkCircleOutline} />
                                        อนุมัติและปลดระงับ
                                    </span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Toast แจ้งความสำเร็จ */}
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
