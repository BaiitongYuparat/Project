import { useEffect, useMemo, useRef, useState } from "react";
import {
    getOwnerTransferRequests,
    decideOwnerTransferRequest,
} from "../../../services/SuperAdmin/ownerTransferService";
import type {
    SuperAdminOwnerTransferRequest,
    OwnerTransferStatus,
} from "../../../types/brand";
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

const TABS: Array<{ key: OwnerTransferStatus | "ALL"; label: string }> = [
    { key: "ALL", label: "ทั้งหมด" },
    { key: "PENDING", label: "รอพิจารณา" },
    { key: "APPROVED", label: "อนุมัติแล้ว" },
    { key: "REJECTED", label: "ปฏิเสธแล้ว" },
];

function StatusBadge({ status }: { status: OwnerTransferStatus }) {
    const map: Record<OwnerTransferStatus, { label: string; className: string }> = {
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

export default function OwnerTransferRequests() {
    const [requests, setRequests] = useState<SuperAdminOwnerTransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<OwnerTransferStatus | "ALL">("PENDING");
    const [query, setQuery] = useState("");

    // Modal พิจารณาคำขอ
    const [selected, setSelected] = useState<SuperAdminOwnerTransferRequest | null>(null);
    const [deciding, setDeciding] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);

    // Toast แจ้งความสำเร็จหลังตัดสินคำขอ
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

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            setRequests(await getOwnerTransferRequests());
        } catch (err) {
            console.error("Failed to fetch owner transfer requests:", err);
            setError("ไม่สามารถโหลดคำขอเปลี่ยน OWNER ได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return requests.filter((r) => {
            const matchTab = tab === "ALL" || r.status === tab;
            const matchQuery =
                !q ||
                r.brand.brand_name.toLowerCase().includes(q) ||
                r.current_owner_email.toLowerCase().includes(q) ||
                r.new_owner_email.toLowerCase().includes(q);
            return matchTab && matchQuery;
        });
    }, [requests, tab, query]);

    const pendingCount = useMemo(
        () => requests.filter((r) => r.status === "PENDING").length,
        [requests]
    );

    const openDetail = (request: SuperAdminOwnerTransferRequest) => {
        setSelected(request);
        setDecisionError(null);
    };

    const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
        if (!selected) return;

        const confirmMessage =
            decision === "APPROVED"
                ? `ยืนยันการอนุมัติเปลี่ยน OWNER ของร้าน "${selected.brand.brand_name}" เป็น ${selected.new_owner_email} ?\n\nอีเมลนี้จะเป็น OWNER ของร้าน และ OWNER เดิม (${selected.current_owner_email}) จะถูกเปลี่ยนเป็น ADMIN ทันที`
                : `ยืนยันการปฏิเสธคำขอเปลี่ยน OWNER ของร้าน "${selected.brand.brand_name}" ?`;
        if (!window.confirm(confirmMessage)) return;

        try {
            setDeciding(true);
            setDecisionError(null);
            const updated = await decideOwnerTransferRequest(selected.id, decision);
            setRequests((prev) =>
                prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
            );
            setSelected(null);
            showToast(
                decision === "APPROVED"
                    ? "อนุมัติและเปลี่ยน OWNER เรียบร้อย"
                    : "ปฏิเสธคำขอเปลี่ยน OWNER เรียบร้อย"
            );
        } catch (err: unknown) {
            console.error("[OwnerTransfer] decision failed:", err);
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
                    <h1 className="text-xl font-bold text-stone-900">คำขอเปลี่ยน OWNER</h1>
                    <p className="mt-1 text-sm text-stone-500">
                        คำขอจากเจ้าของร้านที่ต้องการโอนความเป็น OWNER ให้บัญชีอีเมลอื่น — อนุมัติแล้วระบบจะเปลี่ยนบทบาทให้อัตโนมัติ
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
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"
                            }`}
                        >
                            {t.label}
                            {t.key === "PENDING" && pendingCount > 0 && (
                                <span
                                    className={`rounded-full px-1.5 text-xs font-semibold ${
                                        tab === t.key
                                            ? "bg-white text-gray-900"
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
                        placeholder="ค้นหาชื่อร้าน หรืออีเมล"
                        className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                </div>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-6 md:px-8 md:py-5">
                    <h2 className="text-base font-bold text-stone-900 sm:text-lg">รายการคำขอ</h2>
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
                        <button type="button" onClick={fetchRequests} className="text-blue-700 underline">
                            ลองใหม่
                        </button>
                    </div>
                )}

                {!loading && !error && visible.length === 0 && (
                    <div className="border-t border-stone-200 px-4 py-10 text-center text-stone-400">
                        {requests.length === 0
                            ? "ยังไม่มีคำขอเปลี่ยน OWNER"
                            : "ไม่พบคำขอที่ตรงกับเงื่อนไข"}
                    </div>
                )}

                {!loading && !error && visible.length > 0 && (
                    <>
                        {/* Mobile */}
                        <ul className="divide-y divide-stone-100 border-t border-stone-200 md:hidden">
                            {visible.map((request) => (
                                <li key={request.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-stone-900">
                                                {request.brand.brand_name}
                                            </p>
                                            <p className="break-all text-xs text-stone-500">
                                                {request.current_owner_email} → {request.new_owner_email}
                                            </p>
                                        </div>
                                        <div className="shrink-0">
                                            <StatusBadge status={request.status} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-xs text-stone-400">
                                            {formatDateTime(request.created_at)}
                                        </span>
                                        <Button size="sm" variant="outline" onClick={() => openDetail(request)}>
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
                                        <th scope="col" className="px-8 py-4 font-normal">ร้านค้า</th>
                                        <th scope="col" className="px-4 py-4 font-normal">OWNER เดิม → OWNER ใหม่</th>
                                        <th scope="col" className="px-4 py-4 font-normal">ผู้ยื่น</th>
                                        <th scope="col" className="px-4 py-4 font-normal">วันที่ยื่น</th>
                                        <th scope="col" className="px-4 py-4 font-normal">สถานะ</th>
                                        <th scope="col" className="px-8 py-4" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((request) => (
                                        <tr key={request.id} className="border-b border-stone-100 hover:bg-stone-50">
                                            <td className="px-8 py-4">
                                                <p className="font-medium text-stone-900">
                                                    {request.brand.brand_name}
                                                </p>
                                            </td>
                                            <td className="max-w-xs px-4 py-4">
                                                <p className="break-all text-stone-700">
                                                    {request.current_owner_email} → {request.new_owner_email}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-stone-700">
                                                    {request.requester.name ?? "-"}
                                                </p>
                                                <p className="break-all text-xs text-stone-500">
                                                    {request.requester.email}
                                                </p>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-4 text-stone-600">
                                                {formatDateTime(request.created_at)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <StatusBadge status={request.status} />
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant={
                                                            request.status === "PENDING"
                                                                ? "primary"
                                                                : "outline"
                                                        }
                                                        onClick={() => openDetail(request)}
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
                                    {selected.brand.brand_name}
                                </h3>
                                <p className="mt-0.5 text-sm text-stone-500">
                                    คำขอเปลี่ยน OWNER
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
                                    รายละเอียดการโอน
                                </p>
                                <div className="mt-2 space-y-1 text-sm text-stone-700">
                                    <p>
                                        OWNER เดิม:{" "}
                                        <span className="font-medium">{selected.current_owner_email}</span>
                                    </p>
                                    <p>
                                        OWNER ใหม่:{" "}
                                        <span className="font-medium">{selected.new_owner_email}</span>
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        เมื่ออนุมัติ OWNER เดิมจะถูกเปลี่ยนบทบาทเป็น ADMIN โดยอัตโนมัติ
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-1 text-sm text-stone-500">
                                <p>
                                    ผู้ยื่น:{" "}
                                    <span className="text-stone-700">
                                        {selected.requester.name ?? "-"} · {selected.requester.email}
                                    </span>
                                </p>
                            </div>

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
                                    variant="secondary"
                                    className="flex-1"
                                    disabled={deciding}
                                    onClick={() => handleDecision("REJECTED")}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <IonIcon icon={closeCircleOutline} />
                                        ปฏิเสธคำขอ
                                    </span>
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    disabled={deciding}
                                    onClick={() => handleDecision("APPROVED")}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <IonIcon icon={checkmarkCircleOutline} />
                                        อนุมัติเปลี่ยน OWNER
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
