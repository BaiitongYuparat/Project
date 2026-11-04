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
type StatusMap = Partial<Record<AngleKey, "passed" | "failed">>;

export default function UploadBodyImg() {
  const body = useSelector((state: RootState) => state.body.body);
  const [files, setFiles] = useState<FileMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedImages, setSavedImages] = useState<Record<string, string>>({});
  const inputRefs = useRef<Partial<Record<AngleKey, HTMLInputElement>>>({});

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

  const handleFileChange = (angle: AngleKey, file: File | undefined) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [angle]: file }));
    setStatus((prev) => ({ ...prev, [angle]: undefined }));
    setSuccess(false);
    setErrors([]);
  };

  const handleSubmit = async () => {
    if (!body?.id) {
      setErrors(["ไม่พบข้อมูลร่างกาย กรุณากรอกข้อมูลสัดส่วนก่อน"]);
      return;
    }

    const missingAngles = ANGLES.filter((a) => !files[a.key]).map((a) => a.label);
    if (missingAngles.length > 0) {
      setErrors([`กรุณาอัพโหลดรูปให้ครบทุกมุม: ${missingAngles.join(", ")}`]);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("body_id", body.id);
      ANGLES.forEach((a) => formData.append(a.key, files[a.key]!));

      await api.post("/images/body", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ✅ แก้: refetch จาก backend แทน URL.createObjectURL
      const refreshRes = await api.get(`/images/body/${body.id}`);
      const refreshed: Record<string, string> = {};
      refreshRes.data.data.forEach((img: { angle: string; s3: string }) => {
        refreshed[img.angle] = img.s3;
      });
      setSavedImages(refreshed);

      const allPassed = Object.fromEntries(ANGLES.map((a) => [a.key, "passed"])) as StatusMap;
      setStatus(allPassed);
      setFiles({});
      setSuccess(true);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const failedAngles: string[] = [];
        const newStatus = { ...status };

        err.response.data.errors.forEach((e: { angle: AngleKey; reason?: string }) => {
          newStatus[e.angle] = "failed";
          failedAngles.push(`${ANGLES.find((a) => a.key === e.angle)?.label}: ${e.reason ?? "ไม่ผ่าน"}`);
        });

        setStatus(newStatus);
        setErrors(failedAngles);
      } else {
        setErrors([err.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่"]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">รูปภาพของฉัน</h2>
        <p className="text-sm text-secondary/60">อัพโหลดรูปร่างกาย 4 มุม เพื่อให้ AI ลองเสื้อผ้าได้แม่นยำขึ้น</p>
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
                  : "border-orange-800/30"
              }`}
            >
              <div
                className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary"
                onClick={() => inputRefs.current[angle.key]?.click()}
              >
                {file ? (
                  <img src={URL.createObjectURL(file)} alt={angle.label} className="h-full w-full object-cover" />
                ) : savedImages[angle.key] ? (
                  <img src={savedImages[angle.key]} alt={angle.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-secondary/40">+ เพิ่มรูป</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">{angle.label}</span>
                {angleStatus === "passed" && <span className="text-xs text-green-500">✓ ผ่าน</span>}
                {angleStatus === "failed" && <span className="text-xs text-red-500">✗ ไม่ผ่าน</span>}
              </div>

              <button
                className="rounded-lg border border-orange-800/30 py-1 text-sm hover:bg-primary"
                onClick={() => inputRefs.current[angle.key]?.click()}
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

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          อัพโหลดรูปสำเร็จแล้ว ✓
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(files).length === 0}
        className="w-full rounded-xl bg-secondary py-3 font-bold text-white disabled:opacity-50"
      >
        {loading ? "กำลังตรวจสอบรูป..." : "บันทึกรูปภาพ"}
      </button>
    </div>
  );
}