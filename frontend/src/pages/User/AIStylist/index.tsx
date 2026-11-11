import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { IonIcon } from "@ionic/react";
import { personOutline, bodyOutline } from "ionicons/icons";

import type { RootState } from "../../../store/store";
import { analyzeBodyType, getBodyType } from "../../../services/bodyTypeService";
import { getBody } from "../../../services/bodyService";
import { setBody } from "../../../store/bodySlice";
import { setBodyType } from "../../../store/bodyTypeSlice";
import Button from "../../../components/Button";
import { useRequireAuth } from "../../../hooks/useRequireAuth";

const BODY_TYPE_LABELS: Record<string, string> = {
  hourglass: "หุ่นนาฬิกาทราย · Hourglass",
  pear: "ทรงลูกแพร · Pear",
  apple: "ทรงแอปเปิ้ล · Apple",
  rectangle: "ทรงสี่เหลี่ยม · Rectangle",
  inverted_triangle: "ทรงสามเหลี่ยมกลับหัว · Inverted Triangle",
};

const OCCASIONS = ["ทํางาน", "เดท", "งานแต่ง", "เที่ยว"];

export default function AIStylistPage() {
  const dispatch = useDispatch();
  const body = useSelector((state: RootState) => state.body.body);
  const bodyType = useSelector((state: RootState) => state.bodyType.bodyType);
  const user = useSelector((state: RootState) => state.user.user);

  const requireAuth = useRequireAuth();

  const [selectedOccasion, setSelectedOccasion] = useState("ทํางาน");
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // โหลดข้อมูลสัดส่วนและผลวิเคราะห์ล่าสุดตอนเข้าหน้า — แสดงหน้าจริงเมื่อพร้อม
  // ยังไม่ login: ข้ามการโหลด แสดงหน้าเริ่มต้นได้เลย (กดใช้งานค่อยเด้งให้ login)
  const loadPageData = async () => {
    if (user === null) {
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setPageError(null);
    try {
      const body = await getBody();
      dispatch(setBody(body));
      try {
        const bodyType = await getBodyType();
        dispatch(setBodyType(bodyType));
      } catch {
        // ยังไม่มีผลวิเคราะห์ที่บันทึกไว้ — แสดงหน้าเริ่มต้นแทน
        dispatch(setBodyType(null));
      }
    } catch (err: any) {
      setPageError(
        err.response?.data?.message ?? "โหลดข้อมูลไม่สําเร็จ กรุณาลองใหม่",
      );
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const handleAnalyze = async () => {
    if (!requireAuth()) return;

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
      <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 lg:px-14 flex flex-col gap-6">
        {/* Body Type Card */}
        {pageLoading || pageError ? (
          <section className="relative overflow-hidden rounded-2xl border border-[#DCC3B3] bg-primary p-6 md:px-8 md:py-7 min-h-[240px] flex flex-col justify-center">
            {pageLoading ? (
              <div className="relative z-10 flex flex-col gap-4 animate-pulse">
                <div className="h-7 w-52 rounded-full bg-white/50" />
                <div className="h-10 w-72 rounded-lg bg-white/50" />
                <div className="h-4 w-64 rounded bg-white/50" />
                <div className="h-4 w-56 rounded bg-white/50" />
                <div className="h-4 w-80 rounded bg-white/50" />
                <div className="h-9 w-36 rounded-full bg-white/50" />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col gap-3">
                <p className="text-sm font-semibold text-[#49352D]">
                  {pageError}
                </p>
                <div className="w-fit">
                  <Button variant="secondary" size="sm" onClick={loadPageData}>
                    ลองใหม่
                  </Button>
                </div>
              </div>
            )}
          </section>
        ) : (
        <section className="relative overflow-hidden rounded-2xl border border-[#DCC3B3] bg-primary p-6 md:px-8 md:py-7">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-[#DDBBA6]/30 blur-2xl" />

          {bodyType ? (
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* ซ้าย: ผลวิเคราะห์ */}
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D9BBA8] bg-white/50 px-4 py-2 w-fit">
                  <span className="h-2 w-2 rounded-full bg-[#A77D65]" />
                  <span className="text-xs font-semibold tracking-widest text-[#806B5E]">
                    ผลการวิเคราะห์รูปร่างของคุณ
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-[#49352D]">
                  {BODY_TYPE_LABELS[bodyType.body_type] ?? bodyType.body_type}
                </h2>

                <div className="flex flex-col gap-y-1 text-sm font-medium text-[#685246] border-y border-[#DCC3B3]/60 py-3">
                  {user && body && (
                    <span>
                      <IonIcon icon={personOutline} className="mr-1" />
                      {user.name ?? "ผู้ใช้"} · สูง {body.height} ซม. · น้ําหนัก{" "}
                      {body.weight} กก.
                    </span>
                  )}
                  {body && (
                    <span>
                      <IonIcon icon={bodyOutline} className="mr-1" />
                      อก {body.chest} / เอว {body.waist} / สะโพก {body.hips}{" "}
                      นิ้ว
                    </span>
                  )}
                </div>

                {bodyType.description && (
                  <p className="text-sm leading-relaxed text-[#49352D]/90">
                    {bodyType.description}
                  </p>
                )}

                <div className="flex justify-center w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzeLoading}
                    className="rounded-full shadow-lg shadow-[#806B5E]/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    {analyzeLoading ? "กําลังวิเคราะห์..." : "วิเคราะห์ใหม่"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col gap-4 max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D9BBA8] bg-white/50 px-4 py-2 w-fit">
                  <span className="h-2 w-2 rounded-full bg-[#A77D65]" />
                  <span className="text-xs font-semibold tracking-widest text-[#806B5E]">
                    AI Body Analysis
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-[#49352D]">
                  วิเคราะห์รูปร่าง
                  <br />
                  <span className="text-[#A77D65]">ด้วย AI</span>
                </h2>

                <p className="text-sm leading-7 text-[#806B5E] md:text-base">
                  {body
                    ? "พบข้อมูลสัดส่วนแล้ว กดปุ่มด้านล่างเพื่อให้ AI ช่วยประมวลผลรูปร่างของคุณ"
                    : "กรุณากรอกข้อมูลสัดส่วนร่างกายก่อน เพื่อให้ AI วิเคราะห์ Body Type"}
                </p>

                {/* กดวิเคราะห์ตอนยังไม่ login จะเด้งให้ login ก่อน */}
                <div className="flex justify-center w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzeLoading}
                    className="rounded-full shadow-lg shadow-[#806B5E]/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    {analyzeLoading ? "กําลังวิเคราะห์..." : "วิเคราะห์"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {analyzeError && (
            <p className="relative z-10 mt-4 text-sm font-semibold text-red-600">
              {analyzeError}
            </p>
          )}
        </section>
        )}

        {bodyType && (
          <section className="flex gap-2 flex-wrap">
            {OCCASIONS.map((occasion) => (
              <button
                key={occasion}
                type="button"
                onClick={() => setSelectedOccasion(occasion)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedOccasion === occasion
                    ? "border-[#3E2C25] bg-[#3E2C25] text-white"
                    : "border-[#DCC3B3] bg-white text-[#49352D] hover:bg-primary"
                }`}
              >
                {occasion}
              </button>
            ))}
          </section>
        )}

        {/* Outfit Section */}
        {bodyType && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#49352D] md:text-2xl">
                3 ลุค{selectedOccasion}ที่คัดให้คุณ
              </h2>
              <p className="text-sm text-secondary/60 mt-0.5">
                จากร้านค้า · เน้นช่วงเอวและบาลานซ์สัดส่วน
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#DCC3B3] overflow-hidden bg-white flex flex-col"
                >
                  <div className="h-56 bg-primary flex items-center justify-center">
                    <span className="text-sm text-secondary/30">
                      ภาพชุดแนะนํา
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <p className="font-semibold text-[#49352D]">ชื่อลุค</p>
                    <p className="text-xs text-secondary/60">
                      เหมาะกับ {BODY_TYPE_LABELS[bodyType.body_type]}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full rounded-lg"
                    >
                      ลองใส่ชุดนี้
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
