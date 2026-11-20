import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { trashOutline } from "ionicons/icons";

import type { AppDispatch, RootState } from "../../store/store";
import { logout } from "../../store/userSlice";
import { clearUserData } from "../../store/tryonSlice";
import { deleteMyAccount } from "../../services/userService";

const CONFIRM_TEXT = "ลบบัญชี";

// ปุ่ม + modal ยืนยันให้ shopper ลบบัญชีของตัวเอง (ลบข้อมูลทั้งหมด กู้คืนไม่ได้)
export default function DeleteAccount() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const close = () => {
    if (loading) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteMyAccount();
      dispatch(clearUserData(user.id));
      dispatch(logout());
      navigate("/", { replace: true });
      window.alert("ลบบัญชีและข้อมูลทั้งหมดของคุณเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Delete account failed:", err);
      setError("ลบบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50/60 p-3">
        <p className="text-xs font-semibold text-red-700"> จัดการบัญชี</p>
        <p className="mt-1 text-xs leading-relaxed text-red-600/80">
          ลบบัญชีและข้อมูลทั้งหมดของคุณอย่างถาวร
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <IonIcon icon={trashOutline} className="text-base" />
          ลบบัญชี
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-account-title" className="text-lg font-bold text-red-700">
              ลบบัญชีถาวร?
            </h3>
            <p className="mt-2 text-sm text-[#5F5144]">
              ข้อมูลต่อไปนี้จะถูกลบทั้งหมดและกู้คืนไม่ได้:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#928474]">
              <li>ข้อมูลบัญชีและสัดส่วนร่างกาย</li>
              <li>รูปภาพร่างกายและผลวิเคราะห์รูปร่าง</li>
              <li>ประวัติการลองชุดและรูปที่สร้างไว้</li>
              <li>ลุคที่บันทึก รายการโปรด และเสื้อผ้าของฉัน</li>
              <li>รายงานปัญหาและคำร้องต่าง ๆ</li>
            </ul>

            <label className="mt-4 block text-sm text-[#5F5144]">
              พิมพ์ <span className="font-semibold text-red-700">{CONFIRM_TEXT}</span> เพื่อยืนยัน
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={loading}
                autoFocus
                className="mt-1 w-full rounded-lg border border-[#E5DED2] px-3 py-2 text-sm outline-none focus:border-red-400"
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm text-[#928474] hover:bg-[#F7F4EE] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText.trim() !== CONFIRM_TEXT || loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "กำลังลบ..." : "ลบบัญชีถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
