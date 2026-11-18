import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "./Button";
import { setSuspendedAppeal } from "../store/uiSlice";
import { submitAppeal, getMyAppeals } from "../services/appealService";
import type { RootState } from "../store/store";

// Modal แจ้งเตือนบัญชีถูกระงับ + ยื่นคำร้องขอปลดระงับ
// แสดงตอน login แล้วโดนปฏิเสธ (USER_SUSPENDED) — auth ยื่นคำร้องใช้ cookie appeal_token
type Props = {
    onClose: () => void;
};

type View = "notice" | "form" | "success";

const STATUS_LABEL: Record<string, string> = {
    PENDING: "รอผู้ดูแลพิจารณา",
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ถูกปฏิเสธ",
};

const formatDateTime = (iso?: string | null) =>
    iso
        ? new Date(iso).toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "-";

export default function SuspendedAppealModal({ onClose }: Props) {
    const dispatch = useDispatch();
    const appeal = useSelector((state: RootState) => state.ui.latestAppeal);

    const [view, setView] = useState<View>("notice");
    const [submitted, setSubmitted] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ดึงสถานะคำร้องล่าสุดให้สดอยู่เสมอ (ใช้ appeal_token) — ถ้าดึงไม่ได้ใช้ค่าจากตอน login ต่อ
    useEffect(() => {
        let cancelled = false;
        getMyAppeals()
            .then((appeals) => {
                if (cancelled || appeals.length === 0) return;
                const latest = appeals[0];
                dispatch(
                    setSuspendedAppeal({
                        id: latest.id,
                        status: latest.status,
                        admin_note: latest.admin_note,
                        created_at: latest.created_at,
                        decided_at: latest.decided_at,
                    })
                );
            })
            .catch(() => {
                // token หมดอายุ/ไม่มี — เงียบไว้ ใช้ข้อมูลจาก response ตอน login
            });
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    // คำร้องรอพิจารณา → แสดงหน้าแจ้งสถานะ (ไม่ให้ยื่นซ้ำ) — derive จาก store แทน effect
    const activeView: View = submitted
        ? "success"
        : view === "form" && appeal?.status === "PENDING"
        ? "notice"
        : view;

    // ช่วยดึง response จาก axios error โดยไม่ใช้ any
    const getErrorResponse = (
        err: unknown
    ): { status?: number; data?: { error?: string; message?: string } } => {
        if (err && typeof err === "object" && "response" in err) {
            const resp = (
                err as {
                    response?: {
                        status?: number;
                        data?: { error?: string; message?: string };
                    };
                }
            ).response;
            return resp ?? {};
        }
        return {};
    };

    const canSubmit =
        title.trim().length >= 3 &&
        title.trim().length <= 120 &&
        message.trim().length >= 9 &&
        message.trim().length <= 2000 &&
        !submitting;

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const created = await submitAppeal({
                title: title.trim(),
                message: message.trim(),
            });
            dispatch(
                setSuspendedAppeal({
                    id: created.id,
                    status: created.status,
                    admin_note: created.admin_note,
                    created_at: created.created_at,
                    decided_at: created.decided_at,
                })
            );
            setSubmitted(true);
        } catch (err: unknown) {
            const resp = getErrorResponse(err);
            if (resp.status === 409) {
                setError(resp.data?.error ?? "คุณมีคำร้องที่รอพิจารณาอยู่แล้ว");
            } else if (resp.status === 401) {
                setError("หมดเวลาการยืนยันตัวตน กรุณาปิดหน้าต่างนี้แล้วเข้าสู่ระบบอีกครั้ง");
            } else {
                setError(
                    resp.data?.error ??
                        resp.data?.message ??
                        "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่"
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const statusPill =
        appeal?.status === "PENDING"
            ? "bg-amber-50 text-amber-700 ring-amber-200"
            : appeal?.status === "REJECTED"
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200";

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="suspended-appeal-title"
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
                {/* หัวเรื่อง */}
                <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
                        !
                    </div>
                    <h2
                        id="suspended-appeal-title"
                        className="text-lg font-semibold text-stone-900"
                    >
                        บัญชีของคุณถูกระงับ
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                        บัญชีของคุณถูกระงับการใช้งาน
                        {activeView === "notice" ? " หากเห็นว่าไม่ถูกต้องสามารถยื่นคำร้องเพื่อให้ผู้ดูแลตรวจสอบได้" : ""}
                    </p>
                </div>

                {/* ---------- หน้าแจ้งสถานะ ---------- */}
                {activeView === "notice" && (
                    <div className="mt-5 space-y-3">
                        {appeal && (
                            <div className="rounded-xl bg-stone-50 p-4 text-left ring-1 ring-stone-200">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-stone-700">
                                        คำร้องของคุณ
                                    </span>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusPill}`}
                                    >
                                        {STATUS_LABEL[appeal.status] ?? appeal.status}
                                    </span>
                                </div>
                                <p className="mt-1.5 text-xs text-stone-500">
                                    ยื่นเมื่อ {formatDateTime(appeal.created_at)}
                                </p>

                                {appeal.status === "PENDING" && (
                                    <p className="mt-2 text-sm text-stone-600">
                                        คำร้องอยู่ระหว่างการพิจารณา กรุณารอการตรวจสอบจากผู้ดูแล
                                        (ผลจะแจ้งให้ทราบตอนเข้าสู่ระบบครั้งถัดไป)
                                    </p>
                                )}
                                {appeal.status === "REJECTED" && (
                                    <>
                                        <p className="mt-2 text-sm text-stone-600">
                                            คำร้องของคุณถูกปฏิเสธ
                                        </p>
                                        {appeal.admin_note && (
                                            <p className="mt-1 rounded-lg bg-white p-2.5 text-sm text-stone-700 ring-1 ring-stone-200">
                                                <span className="font-medium">เหตุผลจากผู้ดูแล: </span>
                                                {appeal.admin_note}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-600" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            {appeal?.status !== "PENDING" && (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setError(null);
                                        setView("form");
                                    }}
                                >
                                    {appeal?.status === "REJECTED"
                                        ? "ยื่นคำร้องอีกครั้ง"
                                        : "ยื่นคำร้องขอปลดระงับ"}
                                </Button>
                            )}
                            <Button variant="secondary" onClick={onClose}>
                                {appeal?.status === "PENDING" ? "รับทราบ" : "ปิดหน้าต่าง"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ---------- หน้าฟอร์มยื่นคำร้อง ---------- */}
                {activeView === "form" && (
                    <form
                        className="mt-5 space-y-3 text-left"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (canSubmit) void handleSubmit();
                        }}
                    >
                        <div>
                            <label
                                htmlFor="appeal-title"
                                className="mb-1 block text-sm font-medium text-stone-700"
                            >
                                หัวข้อ
                            </label>
                            <input
                                id="appeal-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={120}
                                placeholder="เช่น ขอปลดระงับบัญชี บัญชีถูกระงับโดยไม่ทราบเหตุผล"
                                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="appeal-message"
                                className="mb-1 block text-sm font-medium text-stone-700"
                            >
                                รายละเอียด / เหตุผล
                            </label>
                            <textarea
                                id="appeal-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={2000}
                                rows={5}
                                placeholder="อธิบายเหตุผลที่ขอให้ปลดระงับบัญชี เช่น สิ่งที่ทำผิดและวิธีที่จะไม่ทำซ้ำ"
                                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                            <p className="mt-1 text-right text-xs text-stone-400">
                                {message.trim().length}/2000
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-600" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                disabled={submitting}
                                onClick={() => {
                                    setError(null);
                                    setView("notice");
                                }}
                            >
                                ย้อนกลับ
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                className="flex-1"
                                disabled={!canSubmit}
                            >
                                {submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}
                            </Button>
                        </div>
                    </form>
                )}

                {/* ---------- หน้าส่งสำเร็จ ---------- */}
                {activeView === "success" && (
                    <div className="mt-5 space-y-4 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-600">
                            ✓
                        </div>
                        <p className="text-sm text-stone-600">
                            ส่งคำร้องเรียบร้อยแล้ว ผู้ดูแลจะพิจารณาและแจ้งผลให้ทราบ
                            <br />
                            (เข้าสู่ระบบอีกครั้งเพื่อดูสถานะล่าสุด / ผลจะส่งทางอีเมลเมื่อพิจารณาเสร็จ)
                        </p>
                        <Button variant="secondary" className="w-full" onClick={onClose}>
                            ปิดหน้าต่าง
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
