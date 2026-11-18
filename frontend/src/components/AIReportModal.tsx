import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  imageOutline,
  trashOutline,
} from "ionicons/icons";

import Button from "./Button";
import type { RootState } from "../store/store";
import { closeAiReport } from "../store/uiSlice";
import { submitAiReport } from "../services/aiReportService";

// Modal แจ้งภาพที่ AI สร้างผิดพลาด — เปิดจากเมนูโปรไฟล์ (Navbar)
// shopper อธิบายปัญหา + แนบภาพหน้าจอ → แอดมินตรวจสอบ → อนุมัติแล้วคืนเครดิต 1 เครดิต

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "w-full rounded-xl border border-secondary/20 bg-white px-3 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary";

const getErrorResponse = (
  err: unknown
): { status?: number; data?: { error?: string; message?: string } } => {
  if (err && typeof err === "object" && "response" in err) {
    return (
      (err as {
        response?: {
          status?: number;
          data?: { error?: string; message?: string };
        };
      }).response ?? {}
    );
  }
  return {};
};

function AIReportDialog() {
  const dispatch = useDispatch();

  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // preview ภาพที่เลือก — สร้าง object URL ใหม่เมื่อไฟล์เปลี่ยน และคืน memory ตอน unmount
  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const close = () => {
    if (submitting) return;
    dispatch(closeAiReport());
  };

  // ปิดด้วย Esc (unmount ทั้ง dialog → ฟอร์มถูกล้างอัตโนมัติ)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) dispatch(closeAiReport());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [submitting, dispatch]);

  const messageLength = message.trim().length;
  const canSubmit = !submitting && messageLength >= 10 && messageLength <= 2000;

  const handlePickImage = (file: File | null) => {
    setError(null);
    if (!file) {
      setImage(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("แนบได้เฉพาะไฟล์ JPG, PNG หรือ WEBP");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("ไฟล์ภาพต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setImage(file);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("กรุณาอธิบายปัญหาอย่างน้อย 10 ตัวอักษร");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitAiReport({
        message: message.trim(),
        page_url: window.location.pathname,
        image: image ?? undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const resp = getErrorResponse(err);
      setError(
        resp.data?.error ??
          resp.data?.message ??
          "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-report-title"
      onClick={close}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-secondary/10 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xl text-secondary">
              <IonIcon icon={alertCircleOutline} />
            </span>
            <div className="min-w-0">
              <h2
                id="ai-report-title"
                className="truncate text-lg font-semibold text-secondary"
              >
                แจ้งภาพที่ AI สร้างผิดพลาด
              </h2>
              <p className="mt-0.5 text-sm text-secondary/60">
                แอดมินจะตรวจสอบ หากอนุมัติจะคืน 1 เครดิตให้คุณ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="ปิดหน้าต่าง"
            className="rounded-lg p-1.5 text-2xl text-secondary/60 transition-colors hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        {/* Body */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              <IonIcon icon={checkmarkCircleOutline} />
            </span>
            <div>
              <p className="font-semibold text-secondary">ส่งเรื่องเรียบร้อยแล้ว</p>
              <p className="mt-1 text-sm text-secondary/60">
                รอแอดมินตรวจสอบ — หากอนุมัติคุณจะได้รับเครดิตคืน 1 เครดิต
              </p>
            </div>
            <Button variant="secondary" onClick={close} className="w-full">
              ปิดหน้าต่าง
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {/* รายละเอียด */}
              <div>
                <label
                  htmlFor="ai-report-input-message"
                  className="mb-1 block text-sm font-medium text-secondary"
                >
                  รายละเอียด <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="ai-report-input-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="อธิบายภาพที่ AI สร้างผิดพลาด เช่น สีเสื้อเพี้ยน, แขนขาด, ลายผ้าไม่ตรงกับสินค้า"
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1 text-right text-xs text-secondary/40">
                  {messageLength}/2000
                </p>
              </div>

              {/* แนบภาพ */}
              <div>
                <p className="mb-1 text-sm font-medium text-secondary">
                  ภาพหน้าจอประกอบ{" "}
                  <span className="font-normal text-secondary/40">(ไม่บังคับ)</span>
                </p>

                {image && previewUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-secondary/20 bg-primary/30 p-3">
                    <img
                      src={previewUrl}
                      alt="ภาพที่แนบ"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-secondary">{image.name}</p>
                      <p className="text-xs text-secondary/50">
                        {(image.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="ลบภาพที่แนบ"
                      className="rounded-lg p-2 text-lg text-secondary/60 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <IonIcon icon={trashOutline} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      id="ai-report-input-image"
                      type="file"
                      accept={ALLOWED_IMAGE_TYPES.join(",")}
                      onChange={(e) =>
                        handlePickImage(e.target.files?.[0] ?? null)
                      }
                      className="sr-only"
                    />
                    <label
                      htmlFor="ai-report-input-image"
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-secondary/30 bg-white px-3 py-4 text-sm text-secondary/60 transition-colors hover:border-secondary/60 hover:bg-secondary/5"
                    >
                      <IonIcon icon={imageOutline} className="text-lg" />
                      แนบภาพหน้าจอ (JPG, PNG, WEBP · ไม่เกิน 5 MB)
                    </label>
                  </>
                )}
              </div>

              {/* หน้าที่พบปัญหา */}
              <p className="rounded-xl bg-secondary/5 px-3 py-2 text-xs text-secondary/60">
                หน้าที่พบปัญหา:{" "}
                <span className="font-medium text-secondary">
                  {window.location.pathname}
                </span>
              </p>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-secondary/10 px-6 py-4">
              <Button
                variant="outline"
                className="flex-1"
                disabled={submitting}
                onClick={close}
              >
                ยกเลิก
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? "กำลังส่ง..." : "ส่งเรื่อง"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// mount dialog เฉพาะตอนเปิด → state ฟอร์มถูกล้างทุกครั้งที่ปิด
export default function AIReportModal() {
  const open = useSelector((state: RootState) => state.ui.isAiReportOpen);
  if (!open) return null;
  return <AIReportDialog />;
}
