import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IonIcon } from "@ionic/react";
import { personOutline, bodyOutline,  } from "ionicons/icons";

import type { RootState } from "../../../store/store";
import { analyzeBodyType } from "../../../services/bodyTypeService";
import { setBodyType } from "../../../store/bodyTypeSlice";
// import Button from "../../../components/Button";

const BODY_TYPE_LABELS: Record<string, string> = {
  hourglass: "หุ่นนาฬิกาทราย · Hourglass",
  pear: "ทรงลูกแพร · Pear",
  apple: "ทรงแอปเปิ้ล · Apple",
  rectangle: "ทรงสี่เหลี่ยม · Rectangle",
  inverted_triangle: "ทรงสามเหลี่ยมกลับหัว · Inverted Triangle",
};

const OCCASIONS = ["ทำงาน", "เดท", "งานแต่ง", "เที่ยว"];

export default function AIStylistPage() {
  const dispatch = useDispatch();
  const body = useSelector((state: RootState) => state.body.body);
  const bodyType = useSelector((state: RootState) => state.bodyType.bodyType);
  const user = useSelector((state: RootState) => state.user.user);

  const [selectedOccasion, setSelectedOccasion] = useState("ทำงาน");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeBodyType();
      dispatch(setBodyType(result));
    } catch (err: any) {
      setAnalyzeError(
        err.response?.data?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setAnalyzeLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14 flex flex-col gap-6 ">
        {/* Header */}
        <div className="text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary">
            AI Stylist
          </h1>
          <p className="text-base text-secondary/60 mt-0.5">
            ค้นหาลุคที่เข้ากับรูปร่าง โอกาส และความเป็นคุณ
          </p>
        </div>

        {/* Body Type Card */}
        <section className="rounded-2xl border border-[#DCC3B3] bg-[#F3E1D4] p-6 text-left shadow-sm flex flex-col gap-4">
          {bodyType ? (
            <>
              {/* หัวข้อบอก Body Type */}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#806B5E]">
                  ผลการวิเคราะห์รูปร่างของคุณ
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-[#49352D]">
                    {/* <IonIcon icon={sparklesOutline} /> */}
                  {BODY_TYPE_LABELS[bodyType.body_type] ?? bodyType.body_type}
                </h2>
              </div>

              {/* สรุปสัดส่วนผู้ใช้ (ขีดเส้นแบ่งบน-ล่างเพิ่มความสะอาด) */}
              <div className="flex flex-col gap-y-1 gap-x-4 border-y border-[#DCC3B3]/60 py-3 text-sm font-medium text-[#685246]">
                {user && body && (
                  <span>
                    <IonIcon icon={personOutline} />
                    {user.name ?? "ผู้ใช้"} · สูง {body.height} ซม. · น้ำหนัก{" "}
                    {body.weight} กก.
                  </span>
                )}
                {body && (
                  <span>
                    <IonIcon icon={bodyOutline} />
                    · อก {body.chest} / เอว {body.waist} / สะโพก {body.hips}{"/"}
                    นิ้ว
                  </span>
                )}
              </div>

              {/* คำแนะนำจาก Gemini AI */}
              {bodyType.description && (
                <p className="text-sm leading-relaxed text-[#49352D]/90">
                  {bodyType.description}
                </p>
              )}

              {/* ปุ่มกดแก้ไข */}
              <button
                onClick={handleAnalyze}
                disabled={analyzeLoading}
                className="w-fit rounded-full border border-[#49352D]/30 bg-white/80 px-5 py-2 text-sm font-semibold text-[#49352D] transition-all hover:border-[#49352D] hover:bg-white disabled:opacity-50"
              >
                {analyzeLoading
                  ? "กำลังวิเคราะห์..."
                  : "วิเคราะห์ใหม่"}
              </button>
            </>
          ) : (
            /* กรณีที่ยังไม่มีข้อมูลวิเคราะห์ */
            <div className="flex flex-col items-start gap-3 py-1">
              <div>
                <h2 className="text-lg font-bold text-[#49352D]">
                  วิเคราะห์ประเภทรูปร่างด้วย AI
                </h2>
                <p className="mt-1 text-sm text-[#806B5E]">
                  {body
                    ? "พบข้อมูลสัดส่วนแล้ว กดปุ่มด้านล่างเพื่อให้ AI ช่วยประมวลผลรูปร่างของคุณ"
                    : "กรุณากรอกข้อมูลสัดส่วนร่างกายก่อน เพื่อให้ AI วิเคราะห์ Body Type"}
                </p>
              </div>

              {body && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeLoading}
                  className="rounded-full bg-[#3E2C25] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#2A1D17] disabled:opacity-50"
                >
                  {analyzeLoading
                    ? "กำลังวิเคราะห์..."
                    : "วิเคราะห์ Body Type เดี๋ยวนี้"}
                </button>
              )}
            </div>
          )}

          {analyzeError && (
            <p className="text-sm font-semibold text-red-600">{analyzeError}</p>
          )}
        </section>

        {/* Occasion Tabs */}
        {bodyType && (
          <div className="flex gap-2 flex-wrap">
            {OCCASIONS.map((occasion) => (
              <button
                key={occasion}
                onClick={() => setSelectedOccasion(occasion)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  selectedOccasion === occasion
                    ? "bg-secondary text-white"
                    : "border border-secondary/30 text-secondary hover:bg-primary"
                }`}
              >
                {occasion}
              </button>
            ))}
          </div>
        )}

        {/* Outfit Section */}
        {bodyType && (
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-secondary leading-tight">
              3 ลุค{selectedOccasion}ที่คัดให้คุณ
            </h3>
            <p className="text-sm text-secondary/60 mt-0.5">
              จากร้านค้า · เน้นช่วงเอวและบาลานซ์สัดส่วน
            </p>

            {/* Outfit Cards Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-orange-800/10 overflow-hidden bg-white flex flex-col"
                >
                  <div className="h-56 bg-primary flex items-center justify-center">
                    <span className="text-sm text-secondary/30">
                      ภาพชุดแนะนำ
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <p className="font-semibold">ชื่อลุค</p>
                    <p className="text-xs text-secondary/60">
                      เหมาะกับ{BODY_TYPE_LABELS[bodyType.body_type]}
                    </p>
                    <button className="mt-2 w-full rounded-lg bg-secondary py-2 text-sm font-bold text-white">
                      ลองใส่ชุดนี้
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
