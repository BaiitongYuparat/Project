import { useState } from "react";
import BodyForm, { type BodyFormValues } from "../../components/BodyForm";
import { updateBody } from "../../services/bodyService";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { setBody } from "../../store/bodySlice";

export default function BodyPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const body = useSelector((state: RootState) => state.body.body);

  const handleSaveBody = async (data: BodyFormValues) => {
    setIsSaving(true);
    setError("");

    try {
      const updatedBody = await updateBody(data);
      // อัปเดตข้อมูลล่าสุดใน Redux
      dispatch(setBody(updatedBody));
    } catch (error) {
      console.error("Update body failed:", error);
      setError("บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (!body) {
    return <div className="mx-auto max-w-xl p-6">ยังไม่มีข้อมูลร่างกาย</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">ข้อมูลร่างกาย</h1>

      <p className="mb-6 text-gray-500">ดูและแก้ไขข้อมูลร่างกายของคุณ</p>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <BodyForm
        initialData={body}
        onSubmit={handleSaveBody}
        isLoading={isSaving}
      />
    </div>
  );
}
