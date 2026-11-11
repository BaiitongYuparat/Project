
import type { BrandMember } from "../../../types/brand";
import Button from "../../Button";

interface ConfirmRemoveModalProps {
  member: BrandMember | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmRemoveModal({
  member,
  loading,
  onCancel,
  onConfirm,
}: ConfirmRemoveModalProps) {
  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-remove-title"
          className="text-lg font-semibold text-[#332F29]"
        >
          ลบสมาชิก
        </h2>

        <p className="mt-2 text-sm text-[#8B806E]">
          คุณแน่ใจหรือไม่ว่าต้องการลบ{" "}
          <span className="font-medium text-[#332F29]">
            {member.name || member.email}
          </span>{" "}
          ({member.email}) ออกจากร้านนี้? เขาจะสูญเสียสิทธิ์การเข้าถึงทันที
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
            {loading ? "กำลังลบ..." : "ลบ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
