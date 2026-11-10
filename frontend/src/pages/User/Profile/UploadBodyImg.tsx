import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { IonIcon } from "@ionic/react";
import {
  arrowUpOutline,
  arrowDownOutline,
  arrowBackOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import type { RootState } from "../../../store/store";
import {
  getBodyImages,
  verifyBodyImage,
  saveBodyImages,
  type SavedImage,
} from "../../../services/bodyService";
import BodyPhotoHints from "./BodyPhotoHints";

const ANGLES = [
  { key: "front", label: "หน้า" },
  { key: "back",  label: "หลัง" },
  { key: "left",  label: "ซ้าย" },
  { key: "right", label: "ขวา"  },
] as const;

type AngleKey     = (typeof ANGLES)[number]["key"];
type FileMap      = Partial<Record<AngleKey, File>>;
type VerifyStatus = "idle" | "verifying" | "passed" | "failed";
type StatusMap    = Partial<Record<AngleKey, VerifyStatus>>;
type TempKeyMap   = Partial<Record<AngleKey, string>>;
type ErrorMap     = Partial<Record<AngleKey, string>>;  // ✅ เปลี่ยนจาก string[]

export default function UploadBodyImg() {
  const body = useSelector((state: RootState) => state.body.body);
  const [files,       setFiles]       = useState<FileMap>({});
  const [status,      setStatus]      = useState<StatusMap>({});
  const [tempKeys,    setTempKeys]    = useState<TempKeyMap>({});
  const [angleErrors, setAngleErrors] = useState<ErrorMap>({});  
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [savedImages, setSavedImages] = useState<Record<string, string>>({});
  const inputRefs = useRef<Partial<Record<AngleKey, HTMLInputElement>>>({});

  useEffect(() => {
    if (!body?.id) return;
    getBodyImages(body.id)
      .then((images: SavedImage[]) => {
        const imageMap: Record<string, string> = {};
        images.forEach((img) => { imageMap[img.angle] = img.s3; });
        setSavedImages(imageMap);
      })
      .catch((err) => console.error("Failed to fetch images:", err));
  }, [body?.id]);

  const handleFileChange = async (angle: AngleKey, file: File | undefined) => {
    if (!file) return;

    setFiles((prev)  => ({ ...prev, [angle]: file }));
    setStatus((prev) => ({ ...prev, [angle]: "verifying" }));
    setTempKeys((prev) => ({ ...prev, [angle]: undefined }));
    setSuccess(false);

    // ล้างเฉพาะ error ของมุมนี้ ไม่แตะมุมอื่น
    setAngleErrors((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });

    try {
      const tempKey = await verifyBodyImage(angle, file);
      setTempKeys((prev) => ({ ...prev, [angle]: tempKey }));
      setStatus((prev)   => ({ ...prev, [angle]: "passed" }));
    } catch (err: any) {
      setStatus((prev) => ({ ...prev, [angle]: "failed" }));
      const reason = err.response?.data?.reason ?? "รูปไม่ผ่านการตรวจสอบ";
      // ✅ เก็บ error แยกตาม key ไม่ทับมุมอื่น
      setAngleErrors((prev) => ({ ...prev, [angle]: reason }));
    }
  };

  const allNewFilesVerified = ANGLES.every(
    (a) => !files[a.key] || status[a.key] === "passed"
  );
  const allAnglesHaveImage = ANGLES.every(
    (a) => files[a.key] || savedImages[a.key]
  );

  const handleSubmit = async () => {
    if (!body?.id) {
      setAngleErrors({ front: "ไม่พบข้อมูลร่างกาย กรุณากรอกข้อมูลสัดส่วนก่อน" });
      return;
    }
    if (!allAnglesHaveImage) {
      const missing: ErrorMap = {};
      ANGLES.filter((a) => !files[a.key] && !savedImages[a.key])
            .forEach((a) => { missing[a.key] = "กรุณาอัพโหลดรูปมุมนี้"; });
      setAngleErrors(missing);
      return;
    }
    if (!allNewFilesVerified) {
      setAngleErrors((prev) => {
        const next = { ...prev };
        ANGLES.forEach((a) => {
          if (status[a.key] === "verifying")
            next[a.key] = "กรุณารอการตรวจสอบให้เสร็จสิ้น";
        });
        return next;
      });
      return;
    }
    if (Object.keys(tempKeys).length === 0) {
      setAngleErrors({ front: "กรุณาเลือกรูปอย่างน้อยหนึ่งมุม" });
      return;
    }

    setLoading(true);
    setAngleErrors({});

    try {
      await saveBodyImages(body.id, tempKeys);
      const refreshed = await getBodyImages(body.id);
      const refreshedMap: Record<string, string> = {};
      refreshed.forEach((img) => { refreshedMap[img.angle] = img.s3; });
      setSavedImages(refreshedMap);
      setFiles({});
      setTempKeys({});
      setStatus({});
      setSuccess(true);
    } catch (err: any) {
      setAngleErrors({ front: err.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่" });
    } finally {
      setLoading(false);
    }
  };

  // มุมที่มี error
  const failedAngles = ANGLES.filter((a) => angleErrors[a.key]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">รูปภาพของฉัน</h2>
        <p className="text-sm text-secondary/60">
          อัพโหลดรูปร่างกาย 4 มุม เพื่อให้ AI ลองเสื้อผ้าได้แม่นยำขึ้น
        </p>
      </div>

      <BodyPhotoHints />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ANGLES.map((angle) => {
          const file        = files[angle.key];
          const angleStatus = status[angle.key];
          const hasError    = !!angleErrors[angle.key];

          return (
            <div
              key={angle.key}
              className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${
                angleStatus === "passed"
                  ? "border-green-400"
                  : angleStatus === "failed" || hasError
                    ? "border-red-400"
                    : angleStatus === "verifying"
                      ? "border-yellow-400"
                      : "border-orange-800/30"
              }`}
            >
              <div
                className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary"
                onClick={() => inputRefs.current[angle.key]?.click()}
              >
                {angleStatus === "verifying" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-sm text-white">กำลังตรวจสอบ...</span>
                  </div>
                )}
                {file ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={angle.label}
                    className="h-full w-full object-contain"
                  />
                ) : savedImages[angle.key] ? (
                  <img
                    src={savedImages[angle.key]}
                    alt={angle.label}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-secondary/40">+ เพิ่มรูป</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">{angle.label}</span>
                {angleStatus === "verifying" && (
                  <span className="text-xs text-yellow-500">กำลังตรวจ...</span>
                )}
                {angleStatus === "passed" && (
                  <span className="text-xs text-green-500">✓ ผ่าน</span>
                )}
                {angleStatus === "failed" && (
                  <span className="text-xs text-red-500">✗ ไม่ผ่าน</span>
                )}
              </div>

              <button
                className="rounded-lg border border-orange-800/30 py-1 text-sm hover:bg-primary disabled:opacity-50"
                onClick={() => inputRefs.current[angle.key]?.click()}
                disabled={angleStatus === "verifying"}
              >
                {file || savedImages[angle.key] ? "เปลี่ยนรูป" : "อัพโหลดรูป"}
              </button>

              <input
                ref={(el) => { if (el) inputRefs.current[angle.key] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(angle.key, e.target.files?.[0])}
              />
            </div>
          );
        })}
      </div>

      {/* แสดง error ทุกมุมที่ fail พร้อมเหตุผล ไม่หายเมื่อแก้มุมอื่น */}
      {failedAngles.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-semibold text-red-700">
            รูปที่ไม่ผ่านการตรวจสอบ ({failedAngles.length} มุม)
          </p>
          <ul className="space-y-1">
            {failedAngles.map((a) => (
              <li key={a.key} className="flex gap-2 text-sm text-red-600">
                <span className="shrink-0 font-medium">✗ {a.label}:</span>
                <span className="text-left">{angleErrors[a.key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          อัพโหลดรูปสำเร็จแล้ว ✓
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(tempKeys).length === 0 || !allNewFilesVerified}
        className="w-full rounded-xl bg-secondary py-3 font-bold text-white disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก..." : "บันทึกรูปภาพ"}
      </button>
    </div>
  );
}