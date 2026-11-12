import { useEffect, useId, type ReactNode } from "react";
import type { Icon } from "@ionic/react";
import { IonIcon } from "@ionic/react";
import { trashOutline } from "ionicons/icons";

import Button from "./Button";

type IconTone = "danger" | "primary";

interface ConfirmModalProps {
  /** false = ไม่ render อะไรเลย */
  open: boolean;
  /** หัวข้อ เช่น "ลบสินค้า" */
  title: string;
  /** ข้อความยืนยัน — รองรับ JSX (เช่น <span className="font-medium">ชื่อ</span>) */
  message: ReactNode;
  /** icon บนกล่อง (ionicons) — default: trashOutline */
  icon?: Icon;
  /** โทนสีของวงกลม icon */
  iconTone?: IconTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** ข้อความบนปุ่มยืนยันขณะ loading เช่น "กำลังลบ..." */
  loadingLabel?: string;
  /** ขณะ loading จะ disable ปุ่มทั้งสองและปิดการปิด modal (Esc/overlay) */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const iconToneStyles: Record<IconTone, string> = {
  danger: "bg-red-100 text-red-600",
  primary: "bg-[#F1EAE0] text-[#87947A]",
};

export default function ConfirmModal({
  open,
  title,
  message,
  icon = trashOutline,
  iconTone = "danger",
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  loadingLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();

  // ปิดด้วยปุ่ม Esc — ยกเว้นตอน loading กันปิดทิ้งระหว่างทำรายการ
  useEffect(() => {
    if (!open || loading) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={loading ? undefined : onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${iconToneStyles[iconTone]}`}
          >
            <IonIcon icon={icon} className="text-2xl" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h2
          id={titleId}
          className="mt-4 text-center text-lg font-semibold text-[#332F29]"
        >
          {title}
        </h2>

        {/* Message */}
        <div className="mt-2 text-center text-sm text-[#8B806E]">{message}</div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && loadingLabel ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
