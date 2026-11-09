import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store/store";
import api from "../../../services/api";

const ANGLES = [
  { key: "front", label: "หน้า" },
  { key: "back", label: "หลัง" },
  { key: "left", label: "ซ้าย" },
  { key: "right", label: "ขวา" },
] as const;

type AngleKey = (typeof ANGLES)[number]["key"];
type FileMap = Partial<Record<AngleKey, File>>;
// สถานะของแต่ละมุม: idle = ยังไม่ได้เลือก, verifying = กำลังตรวจ, passed = ผ่าน Gemini แล้ว, failed = ไม่ผ่าน
type VerifyStatus = "idle" | "verifying" | "passed" | "failed";
type StatusMap = Partial<Record<AngleKey, VerifyStatus>>;
// tempKey ที่ได้กลับมาจาก /images/verify/:angle แต่ละมุม
type TempKeyMap = Partial<Record<AngleKey, string>>;

export default function UploadBodyImg() {
  const body = useSelector((state: RootState) => state.body.body);
  const [files, setFiles] = useState<FileMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [tempKeys, setTempKeys] = useState<TempKeyMap>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedImages, setSavedImages] = useState<Record<string, string>>({});
  const inputRefs = useRef<Partial<Record<AngleKey, HTMLInputElement>>>({});

  // โหลดรูปที่บันทึกไว้แล้วเมื่อเปิดหน้า
  useEffect(() => {
    if (!body?.id) return;

    const fetchImages = async () => {
      try {
        const res = await api.get(`/images/body/${body.id}`);
        const imageMap: Record<string, string> = {};
        res.data.data.forEach((img: { angle: string; s3: string }) => {
          imageMap[img.angle] = img.s3;
        });
        setSavedImages(imageMap);
      } catch (err) {
        console.error("Failed to fetch images:", err);
      }
    };
    fetchImages();
  }, [body?.id]);
  // เมื่อเลือกรูปใหม่ให้ verify กับ Gemini ทันที ผู้ใช้ไม่ต้องกดบันทึกก่อนเพื่อรู้ว่ารูปผ่านหรือไม่
  const handleFileChange = async (angle: AngleKey, file: File | undefined) => {
    if (!file) return;
    // เพิ่มไฟล์ใหม่ และเปลี่ยนสถานะเป็น verifying
    setFiles((prev) => ({ ...prev, [angle]: file }));
    setStatus((prev) => ({ ...prev, [angle]: "verifying" }));
    // ล้าง tempKey เดิมของมุมนี้ เพราะรูปเปลี่ยนแล้ว
    setTempKeys((prev) => ({ ...prev, [angle]: undefined }));
    setSuccess(false);
    setErrors([]);

    try {
      // ส่งรูปไปตรวจกับ Gemini ก่อน ยังไม่บันทึก DB
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post(`/images/verify/${angle}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // ผ่าน: เก็บ tempKey ไว้สำหรับส่งตอนกด "บันทึก"
      setTempKeys((prev) => ({ ...prev, [angle]: res.data.tempKey }));
      setStatus((prev) => ({ ...prev, [angle]: "passed" }));
    } catch (err: any) {
      // ไม่ผ่าน: แสดงสถานะ failed และ reason จาก Gemini
      setStatus((prev) => ({ ...prev, [angle]: "failed" }));
      const reason = err.response?.data?.reason ?? "รูปไม่ผ่านการตรวจสอบ";
      setErrors((prev) => [
        ...prev.filter((e) => !e.startsWith(ANGLES.find((a) => a.key === angle)?.label ?? "")),
        `${ANGLES.find((a) => a.key === angle)?.label}: ${reason}`,
      ]);
    }
  };
  // ตรวจว่าทุกมุมที่เลือกใหม่ผ่าน Gemini แล้ว มุมที่ไม่ได้เลือกใหม่ไม่ต้องตรวจ
  const allNewFilesVerified = ANGLES.every(
    (a) => !files[a.key] || status[a.key] === "passed"
  );
  // ตรวจว่ามีรูปครบ 4 มุม (ทั้งรูปใหม่ที่เลือก และรูปเดิมใน DB)
  const allAnglesHaveImage = ANGLES.every(
    (a) => files[a.key] || savedImages[a.key]
  );
  // กดบันทึก: ส่ง tempKeys ที่ผ่าน Gemini แล้วไปบันทึก DB
  const handleSubmit = async () => {
    if (!body?.id) {
      setErrors(["ไม่พบข้อมูลร่างกาย กรุณากรอกข้อมูลสัดส่วนก่อน"]);
      return;
    }
    // ต้องมีรูปครบ 4 มุม
    if (!allAnglesHaveImage) {
      const missingAngles = ANGLES.filter(
        (a) => !files[a.key] && !savedImages[a.key]
      ).map((a) => a.label);
      setErrors([`กรุณาอัพโหลดรูปให้ครบทุกมุม: ${missingAngles.join(", ")}`]);
      return;
    }
    // รูปใหม่ต้องผ่าน Gemini ทั้งหมดก่อนบันทึก
    if (!allNewFilesVerified) {
      setErrors(["กรุณารอการตรวจสอบรูปให้เสร็จสิ้น หรือเปลี่ยนรูปที่ไม่ผ่าน"]);
      return;
    }
    // ถ้าไม่มีรูปใหม่เลย (ทุกมุมยังเป็นรูปเดิม) ไม่ต้อง confirm
    if (Object.keys(tempKeys).length === 0) {
      setErrors(["กรุณาเลือกรูปอย่างน้อยหนึ่งมุม"]);
      return;
    }
    setLoading(true);
    setErrors([]);
    try {
      // ส่ง tempKeys ของมุมที่เลือกใหม่เท่านั้น
      // backend จะย้ายจาก temp/ ไป body-images/ และบันทึก DB
      await api.post("/images/body", {
        body_id: body.id,
        tempKeys,
      });
      // โหลดรูปใหม่จาก backend พร้อม presigned URL
      const refreshRes = await api.get(`/images/body/${body.id}`);
      const refreshed: Record<string, string> = {};
      refreshRes.data.data.forEach((img: { angle: string; s3: string }) => {
        refreshed[img.angle] = img.s3;
      });
      setSavedImages(refreshed);
      // รีเซ็ตสถานะทั้งหมดหลังบันทึกสำเร็จ
      setFiles({});
      setTempKeys({});
      setStatus({});
      setSuccess(true);
    } catch (err: any) {
      setErrors([err.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">รูปภาพของฉัน</h2>
        <p className="text-sm text-secondary/60">
          อัพโหลดรูปร่างกาย 4 มุม เพื่อให้ AI ลองเสื้อผ้าได้แม่นยำขึ้น
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ANGLES.map((angle) => {
          const file = files[angle.key];
          const angleStatus = status[angle.key];

          return (
            <div
              key={angle.key}
              className={`flex flex-col gap-2 rounded-xl border-2 p-3 ${
                angleStatus === "passed"
                  ? "border-green-400"
                  : angleStatus === "failed"
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
                {/* แสดง overlay ระหว่างตรวจรูป */}
                {angleStatus === "verifying" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-sm text-white">กำลังตรวจสอบ...</span>
                  </div>
                )}

                {file ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={angle.label}
                    className="h-full w-full object-cover"
                  />
                ) : savedImages[angle.key] ? (
                  <img
                    src={savedImages[angle.key]}
                    alt={angle.label}
                    className="h-full w-full object-cover"
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
                // ไม่ให้กดเปลี่ยนรูประหว่างที่กำลังตรวจมุมนี้
                disabled={angleStatus === "verifying"}
              >
                {file || savedImages[angle.key] ? "เปลี่ยนรูป" : "อัพโหลดรูป"}
              </button>

              <input
                ref={(el) => {
                  if (el) inputRefs.current[angle.key] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(angle.key, e.target.files?.[0])}
              />
            </div>
          );
        })}
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          อัพโหลดรูปสำเร็จแล้ว ✓
        </div>
      )}

      <button
        onClick={handleSubmit}
        // ปิดปุ่มถ้า: กำลัง loading, ไม่มีรูปใหม่, หรือรูปใหม่ยังไม่ผ่านทั้งหมด
        disabled={
          loading ||
          Object.keys(tempKeys).length === 0 ||
          !allNewFilesVerified
        }
        className="w-full rounded-xl bg-secondary py-3 font-bold text-white disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก..." : "บันทึกรูปภาพ"}
      </button>
    </div>
  );
}