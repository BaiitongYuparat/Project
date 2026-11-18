// components/BodyModal.tsx
import { useState } from "react";

import BodyForm, { type BodyFormValues } from "./BodyForm";
import { createBody } from "../services/bodyService";
import { setBody } from "../store/bodySlice";
import { closeBody } from "../store/uiSlice";
import { useDispatch } from "react-redux";
import { updateMe,  } from "../services/userService";
import GenderSelector from "./GenderSelector";
import type { Gender } from "../types/user";



type BodyModalProps = {
  isOpen: boolean;
};

export default function BodyModal({ isOpen }: BodyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const [gender, setGender] = useState<Gender | "">("");

  if (!isOpen) return null;

  

  const handleCreateBody = async (data: BodyFormValues) => {
    if (!gender) {
      setError("กรุณาเลือกเพศก่อนบันทึก เพื่อใช้ในการวิเคราะห์รูปร่าง");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // บันทึกเพศ
      await updateMe({ gender });
      const savedBody = await createBody(data);
      // เก็บข้อมูล Body ที่บันทึกสำเร็จลง Redux
      dispatch(setBody(savedBody));
      // ปิด Modal หลังบันทึกสำเร็จเท่านั้น
      dispatch(closeBody());
    } catch (error) {
      console.error("Create body failed:", error);
      setError("บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-modal-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-primary/30 p-4 rounded-lg border-2 border-primary shadow-md shadow-secondary mb-4">
          <h2 id="body-modal-title" className="text-xl font-bold leading-tight">
            ข้อมูลร่างกาย
          </h2>
          <p className="mt-0.5 text-sm text-grey-100">
            กรุณากรอกข้อมูลร่างกายของคุณ
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mb-4">
          <GenderSelector value={gender} onChange={setGender} />
        </div>

        <BodyForm onSubmit={handleCreateBody} isLoading={isLoading} />
      </div>
    </div>
  );
}
