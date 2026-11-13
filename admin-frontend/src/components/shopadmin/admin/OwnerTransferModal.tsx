import { useState } from "react";
import Button from "../../Button";
import Input from "../../Input";

interface OwnerTransferModalProps {
  currentOwnerEmail: string;
  /** ยื่นคำขอ — throw เมื่อไม่สำเร็จ (error ไปโชว์ในฟอร์ม) */
  onSubmit: (email: string) => Promise<void>;
  onCancel: () => void;
}

export default function OwnerTransferModal({
  currentOwnerEmail,
  onSubmit,
  onCancel,
}: OwnerTransferModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    if (email.trim().toLowerCase() === currentOwnerEmail.toLowerCase()) {
      setError("อีเมลใหม่ต้องไม่ใช่อีเมลของเจ้าของร้านคนปัจจุบัน");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await onSubmit(email.trim());
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "ยื่นคำขอเปลี่ยน OWNER ไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-[#332F29]">
          ขอเปลี่ยน OWNER ของร้าน
        </h3>

        <p className="text-sm text-[#8B806E] mt-2">
          ระบุอีเมลของผู้ที่จะเป็นเจ้าของร้านคนใหม่
          คำขอจะถูกส่งไปยัง Super Admin เพื่อพิจารณาอนุมัติ
          เมื่ออนุมัติแล้ว คุณ (เจ้าของร้านคนปัจจุบัน) จะถูกเปลี่ยนบทบาทเป็น ADMIN
        </p>

        <div className="mt-4">
          <Input
            label="อีเมลของ OWNER คนใหม่"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="กรอกอีเมลของ OWNER คนใหม่"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "กำลังส่งคำขอ..." : "ส่งคำขอ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
