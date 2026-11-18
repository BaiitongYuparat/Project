import { useState } from "react";

import { downloadTryOnImage } from "../../services/tryonService";

interface Props {
  /** id งาน try-on — ใช้ดึงไฟล์ผ่าน backend */
  jobId: string;
  url: string;
  /** ใช้ตั้งชื่อไฟล์ เช่น "พิม · หน้า" */
  label?: string;
}

const fileName = (label?: string) =>
  `tryon-${(label ?? "result").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.png`;

export default function ResultActions({ jobId, url, label }: Props) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [message, setMessage] = useState("");

  const download = async () => {
    setBusy("download");
    setMessage("");
    try {
      const objectUrl = URL.createObjectURL(await downloadTryOnImage(jobId));
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName(label);
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage("บันทึกภาพลงเครื่องแล้ว");
    } catch (err) {
      console.error("Download failed:", err);
      setMessage("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    setMessage("");
    try {
      const title = "ภาพลองเสื้อผ้า";
      if (navigator.share) {
        try {
          const file = new File([await downloadTryOnImage(jobId)], fileName(label), { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title });
            return;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          // อ่านไฟล์ไม่ได้ → แชร์เป็นลิงก์แทน
        }
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("คัดลอกลิงก์ภาพแล้ว");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Share failed:", err);
      setMessage("แชร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  };

  const btn =
    "flex-1 rounded-full border border-[#3B2C25] bg-white py-3 text-sm font-semibold text-[#3B2C25] transition hover:bg-[#3B2C25] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <button type="button" onClick={download} disabled={busy !== null} className={btn}>
          {busy === "download" ? "กำลังบันทึก..." : "⬇ ดาวน์โหลด / บันทึกภาพ"}
        </button>
        <button type="button" onClick={share} disabled={busy !== null} className={btn}>
          {busy === "share" ? "กำลังแชร์..." : "↗ แชร์"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-2 text-center text-sm text-[#8A7F72]">
          {message}
        </p>
      )}
    </div>
  );
}
