// components/BodyModal.tsx
import { useState } from "react";

import BodyForm, {
  type BodyFormValues,
} from "./BodyForm";
import { createBody} from "../services/bodyService";
import { setBody } from "../store/bodySlice";
import { closeBody } from "../store/uiSlice";
import { useDispatch } from "react-redux";

type BodyModalProps = {
  isOpen: boolean;
};

export default function BodyModal({ isOpen}: BodyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();

  if (!isOpen) return null;

   const handleCreateBody = async (data: BodyFormValues) => {
    setIsLoading(true);
    setError("");

    try {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-modal-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >

        <p className="mb-5 text-sm text-gray-500">
          กรุณากรอกข้อมูลร่างกายของคุณ
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <BodyForm
          onSubmit={handleCreateBody}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}