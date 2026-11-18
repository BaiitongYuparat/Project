import { useState, useEffect } from "react";
import BodyForm, { type BodyFormValues } from "../../../components/BodyForm";
import { getBody, updateBody } from "../../../services/bodyService";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import { setBody } from "../../../store/bodySlice";
import { getMe, updateMe } from "../../../services/userService";
import GenderSelector from "../../../components/GenderSelector";
import type { Gender } from "../../../types/user";
import Button from "../../../components/Button";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

const formatBodyValue = (value: number | null | undefined, suffix: string) =>
  value == null ? "—" : `${value} ${suffix}`;

export default function BodyPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();
  const body = useSelector((state: RootState) => state.body.body);
  const user = useSelector((state: RootState) => state.user.user);
  const [gender, setGender] = useState<Gender | "">("");

  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!user) return;

    getMe()
      .then((u) => {
        if (u.gender) setGender(u.gender);
      })
      .catch((e) => console.error("Load user failed:", e));

    const loadLatestBody = async () => {
      try {
        const latestBody = await getBody();
        dispatch(setBody(latestBody));
        setIsEditing(false);
      } catch (err) {
        dispatch(setBody(null));
        setIsEditing(true);
      }
    };

    loadLatestBody();
  }, [dispatch, user]);

  const handleSaveBody = async (data: BodyFormValues) => {
    if (!requireAuth()) return;

    if (!gender) {
      setError("กรุณาเลือกเพศก่อนบันทึก เพื่อใช้ในการวิเคราะห์รูปร่าง");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await updateMe({ gender });
      const updatedBody = await updateBody(data);
      dispatch(setBody(updatedBody));
      setIsEditing(false);
    } catch (error) {
      console.error("Update body failed:", error);
      setError("บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
      <div className="mb-6 rounded-[28px] border border-[#E7E0D5] bg-[#FDFBF8] p-2 md:p-6 shadow-[0_18px_48px_rgba(51,47,41,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#8A7F72]">
              Profile
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#332F29]">
              ข้อมูลร่างกาย
            </h1>
          </div>

          {body && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsEditing(true)}
              className="min-w-[130px]"
            >
              แก้ไขข้อมูล
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[24px] border border-[#E7E0D5] bg-white p-5 shadow-[0_12px_35px_rgba(51,47,41,0.04)]">
          <div className="mb-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#8A7F72]">
              เพศ
            </p>
            <GenderSelector value={gender} onChange={setGender} />
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {!isEditing && body && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A7F72]">ส่วนสูง</p>
                <p className="mt-2 text-2xl font-bold text-[#332F29]">{formatBodyValue(body.height, "ซม.")}</p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A7F72]">น้ำหนัก</p>
                <p className="mt-2 text-2xl font-bold text-[#332F29]">{formatBodyValue(body.weight, "กก.")}</p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A7F72]">รอบอก</p>
                <p className="mt-2 text-xl font-bold text-[#332F29]">{formatBodyValue(body.chest, "นิ้ว")}</p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A7F72]">รอบเอว</p>
                <p className="mt-2 text-xl font-bold text-[#332F29]">{formatBodyValue(body.waist, "นิ้ว")}</p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A7F72]">รอบสะโพก</p>
                <p className="mt-2 text-xl font-bold text-[#332F29]">{formatBodyValue(body.hips, "นิ้ว")}</p>
              </div>
            </div>
          )}

          {!isEditing && !body && (
            <div className="rounded-2xl border border-dashed border-[#DCCFB8] bg-[#FAF7F0] p-8 text-center">
              <p className="text-lg font-semibold text-[#332F29]">ยังไม่มีข้อมูลร่างกาย</p>
              <p className="mt-2 text-sm text-[#8A7F72]">
                เพิ่มข้อมูลเพื่อให้ระบบวิเคราะห์รูปร่างและแนะนำชุดที่เหมาะสมกับคุณ
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setIsEditing(true)}
                >
                  เพิ่มข้อมูล
                </Button>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="mt-5 rounded-[22px] border border-[#E7E0D5] bg-[#FAF7F0] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#332F29]">
                  {body ? "แก้ไขข้อมูลร่างกาย" : "เพิ่มข้อมูลร่างกาย"}
                </h2>
                {body && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    ยกเลิก
                  </Button>
                )}
              </div>

              <BodyForm
                initialData={body}
                onSubmit={handleSaveBody}
                isLoading={isSaving}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
