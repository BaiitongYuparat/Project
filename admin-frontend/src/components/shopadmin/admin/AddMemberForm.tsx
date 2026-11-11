
import { useState } from "react";
import Button from "../../Button";
import Input from "../../Input";

interface AddMemberFormProps {
  onAdd: (email: string) => Promise<void>;
}

export default function AddMemberForm({ onAdd }: AddMemberFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await onAdd(email.trim());
      setEmail("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "เพิ่มสมาชิกไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-[#E9DFC9] p-5"
    >
      <h3 className="text-lg font-semibold text-[#332F29] mb-1">
        เพิ่มสมาชิกใหม่
      </h3>

      <p className="text-sm text-[#8B806E] mb-4">
        เพิ่มผู้ใช้ LongDress ที่มีอยู่แล้วเข้ามาจัดการร้านนี้
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex-1 w-full">
          <Input
            label="ที่อยู่อีเมล"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="กรอกอีเมลของสมาชิก"
            required
          />
        </div>

        <div className="sm:pt-6">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? "กำลังเพิ่ม..." : "+ เพิ่มสมาชิก"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </form>
  );
}
