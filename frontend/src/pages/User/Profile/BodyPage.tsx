import { useState, useEffect } from "react";
import BodyForm, { type BodyFormValues } from "../../../components/BodyForm";
import { updateBody } from "../../../services/bodyService";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import { setBody } from "../../../store/bodySlice";
import { getMe, updateMe } from "../../../services/userService";
import GenderSelector from "../../../components/GenderSelector";
import type { Gender } from "../../../types/user";
import Button from "../../../components/Button";
import { openBody } from "../../../store/uiSlice";
import BodyModal from "../../../components/BodyModal";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

export default function BodyPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const body = useSelector((state: RootState) => state.body.body);
  const user = useSelector((state: RootState) => state.user.user);
  const [gender, setGender] = useState<Gender | "">("");
  const isBodyOpen = useSelector((state: RootState) => state.ui.isBodyOpen);

  const requireAuth = useRequireAuth();

  // โหลดเพศเดิมของผู้ใช้ (ข้ามไว้ก่อนถ้ายังไม่ login)
  useEffect(() => {
    if (user === null) return;

    getMe()
      .then((u) => {
        if (u.gender) setGender(u.gender);
      })
      .catch((e) => console.error("Load user failed:", e));
  }, [user]);

  const handleSaveBody = async (data: BodyFormValues) => {
    if (!requireAuth()) return;

    if (!gender) {
      setError("กรุณาเลือกเพศก่อนบันทึก เพื่อใช้ในการวิเคราะห์รูปร่าง");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      // บันทึกเพศ
      await updateMe({ gender });
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

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold ">ข้อมูลร่างกาย</h1>

      <p className="mb-6 text-gray-500">ดูและแก้ไขข้อมูลร่างกายของคุณ</p>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mb-4">
        <GenderSelector value={gender} onChange={setGender} />
      </div>
      {body ? (
        <BodyForm
          initialData={body}
          onSubmit={handleSaveBody}
          isLoading={isSaving}
        />
      ) : (
        <div>
          <p>ยังไม่มีข้อมูลร่างกาย</p>
          <Button onClick={() => requireAuth(() => dispatch(openBody()))}>
            เพิ่มข้อมูล
          </Button>
        </div>
      )}
      {isBodyOpen && <BodyModal isOpen={isBodyOpen} />}
    </div>
  );
}
