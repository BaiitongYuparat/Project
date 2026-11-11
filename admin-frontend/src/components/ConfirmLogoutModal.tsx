import Button from "./Button";

interface ConfirmLogoutModalProps {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmLogoutModal({
  open,
  loading,
  onCancel,
  onConfirm,
}: ConfirmLogoutModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-logout-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-logout-title"
          className="text-lg font-semibold text-[#332F29]"
        >
          ยืนยันการออกจากระบบ
        </h2>

        <p className="mt-2 text-sm text-[#8B806E]">
          คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ? คุณจะต้องเข้าสู่ระบบอีกครั้งเพื่อกลับมาใช้งาน
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
