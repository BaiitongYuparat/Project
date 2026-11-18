import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useLocation } from "react-router-dom";

import { getProducts, type Product } from "../../../services/productService";
import ModelPicker, { type SubjectMode } from "../../../components/tryon/ModelPicker";
import GarmentPicker from "../../../components/tryon/GarmentPicker";
import SavedLooks from "../../../components/tryon/SavedLooks";
import ResultActions from "../../../components/tryon/ResultActions";
import TryOnCanvas from "../../../components/tryon/TryOnCanvas";
import {
  ANGLES,
  colorOf,
  hasView,
  slotOf,
  type Angle,
  type ColorSelection,
  type GarmentSlot,
  type TryOnSubject,
} from "../../../components/tryon/types";
import type { RootState } from "../../../store/store";
import { addLook, removeLook, saveSession, type SavedLook } from "../../../store/tryonSlice";
import { useRequireAuth } from "../../../hooks/useRequireAuth";
import {
  failedJobMessage,
  getTryOn,
  startTryOn,
  tryOnErrorMessage,
  waitForTryOn,
} from "../../../services/tryonService";

// ช่องที่ชนกัน: เลือกเดรส/ชุดเซ็ต จะเอาเสื้อ+กางเกงออก และกลับกัน
const CONFLICTS: Record<GarmentSlot, GarmentSlot[]> = {
  top: ["top", "full"],
  bottom: ["bottom", "full"],
  full: ["top", "bottom", "full"],
  accessory: [],
};

const NO_LOOKS: SavedLook[] = [];

export default function TryOnPage() {
  const location = useLocation();
  const preset = location.state as { productId?: string; colorId?: string } | null;
  const presetProductId = preset?.productId;
  const requireAuth = useRequireAuth();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const user = useSelector((state: RootState) => state.user.user);
  const authChecked = useSelector((state: RootState) => state.user.authChecked);
  const looks = useSelector((state: RootState) => (user ? state.tryon.looksByUser[user.id] : undefined)) ?? NO_LOOKS;

  const [subject, setSubject] = useState<TryOnSubject | null>(null);
  const [angle, setAngle] = useState<Angle>("front");
  // null = เพิ่งเข้าหน้า ยังไม่ได้เลือก "รูปของฉัน / โมเดล"
  const [mode, setMode] = useState<SubjectMode>(null);
  // สั่งให้ ModelPicker เลือกผู้ลองตาม key (กู้คืน session / ใช้ลุคที่บันทึก)
  const [requestedSubject, setRequestedSubject] = useState<{ key: string; nonce: number } | null>(null);
  // กู้คืนสถานะจาก store เสร็จแล้ว — หลังจากนี้ค่อยเริ่มบันทึก session
  const [hydrated, setHydrated] = useState(false);
  // งานที่กำลังสร้างอยู่ — เก็บใน session เพื่อ poll ต่อได้ถ้า refresh / ออกจากหน้า
  const [pendingJob, setPendingJob] = useState<{ id: string; signature: string; label: string } | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(presetProductId ? [presetProductId] : []);
  const [notice, setNotice] = useState("");
  // สีที่เลือกต่อสินค้า (ไม่มี = สีแรก)
  const [colorSelection, setColorSelection] = useState<ColorSelection>(
    presetProductId && preset?.colorId ? { [presetProductId]: preset.colorId } : {},
  );

  const [generating, setGenerating] = useState(false);
  // ผลลัพธ์ล่าสุด — แสดงค้างไว้จนกว่าจะสร้างภาพใหม่ (เปลี่ยนโมเดล/มุม/ชุดไม่ทำให้ภาพหาย)
  const [result, setResult] = useState<{ id: string; url: string; signature: string; label: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // สิ่งที่กำลัง gen อยู่ — ให้หน้าจอแสดงตามนี้จนกว่าจะเสร็จ แม้ state ปัจจุบันจะเปลี่ยน
  const [pending, setPending] = useState<{
    subject: TryOnSubject;
    angle: Angle;
    garments: Product[];
    colorSelection: ColorSelection;
  } | null>(null);
  // ใช้ ref กัน stale closure (effect ใน ModelPicker เรียก onSubjectChange ได้ทุกเมื่อ)
  const generatingRef = useRef(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) => {
        console.error("Load products failed:", err);
        setProductsError("โหลดสินค้าไม่สำเร็จ");
        setProducts([]);
      });
  }, []);

  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );

  const garments = useMemo(
    () => selectedIds.map((id) => productById.get(id)).filter((p): p is Product => !!p),
    [selectedIds, productById],
  );

  const canGenerate = !!subject && garments.length > 0 && !generating;

  // สินค้า + สีที่จะส่งไป gen (สีแรกถ้ายังไม่ได้เลือก)
  const items = garments.map((g) => ({ product_id: g.id, color_id: colorOf(g, colorSelection) }));
  const signature = `${subject?.key ?? ""}|${angle}|${items.map((i) => `${i.product_id}:${i.color_id ?? ""}`).join(",")}`;
  const resultUrl = result?.url ?? null;
  // ตัวเลือกปัจจุบันไม่ตรงกับภาพที่แสดงอยู่ → บอกให้กดสร้างใหม่
  const resultStale = !!result && result.signature !== signature;

  // ออกจากหน้า → หยุด poll (งานยังรันต่อที่ backend และกลับมา poll ต่อได้จาก pendingJob ใน session)
  useEffect(() => () => abortRef.current?.abort(), []);

  const angleLabelOf = (a: Angle) => ANGLES.find((x) => x.key === a)?.label ?? a;

  // ผลของงาน: สำเร็จ → แสดงภาพ, ไม่สำเร็จ → แจ้งสาเหตุ
  const applyDone = (done: Awaited<ReturnType<typeof getTryOn>>, sig: string, label: string) => {
    if (done.status === "SUCCESS" && done.image_url) {
      setResult({ id: done.id, url: done.image_url, signature: sig, label });
    } else {
      setNotice(failedJobMessage(done.error_code));
    }
  };

  // กู้คืนสถานะที่ค้างไว้ (refresh / กลับมาหน้านี้) — รอรู้ผู้ใช้ + โหลดสินค้าเสร็จก่อน
  useEffect(() => {
    if (hydrated || !authChecked || products === null) return;

    // เลื่อนไปทำนอก effect body (ตั้ง state หลายตัวพร้อมกัน) — cleanup กันรันซ้ำตอน StrictMode
    const timer = setTimeout(() => {
      const session = store.getState().tryon.session;
      if (session && session.userId === (user?.id ?? null)) {
        setMode(session.mode);
        if (session.mode) {
          setAngle(session.angle);
          if (session.subjectKey) setRequestedSubject({ key: session.subjectKey, nonce: Date.now() });
        }
        // มาจากปุ่ม "ลองใส่" ของสินค้า → ใช้สินค้านั้น ไม่ทับด้วยของเดิม
        if (!presetProductId) {
          const ids = session.selectedIds.filter((id) => products.some((p) => p.id === id));
          setSelectedIds(ids);
          setColorSelection(session.colorSelection);
        }
        if (session.result) {
          const { id, signature: sig, label } = session.result;
          getTryOn(id)
            .then((job) => job.status === "SUCCESS" && job.image_url && setResult({ id, url: job.image_url, signature: sig, label }))
            .catch((err) => console.error("Restore result failed:", err));
        }
        if (session.pendingJob) {
          const job = session.pendingJob;
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;
          generatingRef.current = true;
          setGenerating(true);
          setPendingJob(job);
          waitForTryOn(job.id, controller.signal)
            .then((done) => applyDone(done, job.signature, job.label))
            .catch((err) => {
              if (controller.signal.aborted) return;
              console.error("Resume try-on failed:", err);
              setNotice(tryOnErrorMessage(err));
            })
            .finally(() => {
              if (abortRef.current === controller) {
                generatingRef.current = false;
                setPendingJob(null);
                setGenerating(false);
              }
            });
        }
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, authChecked, products, user]);

  // บันทึกสถานะลง store (→ localStorage) ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (!hydrated) return;
    dispatch(
      saveSession({
        userId: user?.id ?? null,
        mode,
        subjectKey: subject?.key ?? null,
        angle,
        selectedIds,
        colorSelection,
        result: result ? { id: result.id, signature: result.signature, label: result.label } : null,
        pendingJob,
      }),
    );
  }, [hydrated, dispatch, user, mode, subject, angle, selectedIds, colorSelection, result, pendingJob]);

  const handleSubjectChange = (next: TryOnSubject | null) => {
    if (!generatingRef.current) setSubject(next);
  };

  const handleAngleChange = (next: Angle) => {
    if (generatingRef.current) return;
    setAngle(next);
    // เอาสินค้าที่ไม่มีรูปมุมนี้ออกจากที่เลือกไว้
    const dropped = garments.filter((g) => !hasView(g, next));
    if (dropped.length > 0) {
      const ids = new Set(dropped.map((g) => g.id));
      setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
      setNotice(`เอาออก ${dropped.length} ชิ้นที่ไม่มีรูปมุมนี้: ${dropped.map((g) => g.name).join(", ")}`);
    } else {
      setNotice("");
    }
  };

  const handleModeChange = (next: Exclude<SubjectMode, null>) => {
    if (generatingRef.current) return;
    if (next === "me" && !requireAuth()) return;
    setMode(next);
    handleAngleChange("front");
  };

  const toggleGarment = (product: Product) => {
    if (generatingRef.current) return;
    setNotice("");
    setSelectedIds((prev) => {
      if (prev.includes(product.id)) return prev.filter((id) => id !== product.id);

      const slot = slotOf(product.category);
      const blocked = slot ? CONFLICTS[slot] : [];
      const kept = prev.filter((id) => {
        const other = productById.get(id);
        const otherSlot = other ? slotOf(other.category) : null;
        return !otherSlot || !blocked.includes(otherSlot);
      });
      return [...kept, product.id];
    });
  };

  const changeColor = (productId: string, colorId: string) => {
    if (generatingRef.current) return;
    setColorSelection((prev) => ({ ...prev, [productId]: colorId }));
  };

  const removeGarment = (productId: string) => {
    if (generatingRef.current) return;
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleGenerate = async () => {
    if (!canGenerate || !subject || !requireAuth()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setNotice("");
    generatingRef.current = true;
    setPending({ subject, angle, garments, colorSelection });
    setGenerating(true);
    try {
      const label = `${subject.name} · ${angleLabelOf(angle)}`;
      const job = await startTryOn({
        view: angle,
        source: subject.key === "me" ? { type: "body" } : { type: "model", model_id: subject.key.replace(/^model:/, "") },
        items: items.map(({ product_id, color_id }) => (color_id ? { product_id, color_id } : { product_id })),
        // กดซ้ำตอนมีผลของชุดนี้อยู่แล้ว = ขอภาพใหม่ ไม่ใช่ขอภาพเดิม
        regenerate: !!resultUrl,
      });
      setPendingJob({ id: job.id, signature, label });
      // ผลเดิมจาก cache ตอบ SUCCESS ทันที ไม่ต้อง poll
      const done =
        job.status === "SUCCESS" ? await getTryOn(job.id) : await waitForTryOn(job.id, controller.signal);

      applyDone(done, signature, label);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Try-on failed:", err);
      setNotice(
        err instanceof DOMException && err.name === "TimeoutError"
          ? "ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
          : tryOnErrorMessage(err),
      );
    } finally {
      if (abortRef.current === controller) {
        generatingRef.current = false;
        setPendingJob(null);
        setPending(null);
        setGenerating(false);
      }
    }
  };

  const alreadySaved = !!result && looks.some((l) => l.resultId === result.id);
  const canSaveLook = !!user && !!mode && !!subject && !!result && !resultStale && !generating;

  const handleSaveLook = () => {
    if (!canSaveLook || !user || !mode || !subject || !result || savingName === null) return;
    dispatch(
      addLook({
        userId: user.id,
        look: {
          id: crypto.randomUUID(),
          name: savingName.trim() || `ลุค ${looks.length + 1}`,
          created_at: new Date().toISOString(),
          mode,
          subjectKey: subject.key,
          subjectName: subject.name,
          angle,
          items: items.map(({ product_id, color_id }) => ({ product_id, color_id })),
          resultId: result.id,
        },
      }),
    );
    setSavingName(null);
    setNotice("บันทึกลุคแล้ว");
  };

  const applyLook = (look: SavedLook) => {
    if (generatingRef.current) return;
    const present = look.items.filter((i) => products?.some((p) => p.id === i.product_id));
    setMode(look.mode);
    setAngle(look.angle);
    setRequestedSubject({ key: look.subjectKey, nonce: Date.now() });
    setSelectedIds(present.map((i) => i.product_id));
    setColorSelection(
      Object.fromEntries(present.flatMap((i) => (i.color_id ? [[i.product_id, i.color_id] as const] : []))),
    );
    setSavingName(null);
    setNotice(
      present.length < look.items.length
        ? `สินค้า ${look.items.length - present.length} ชิ้นในลุคนี้ไม่มีให้เลือกแล้ว`
        : "",
    );
    const sig = `${look.subjectKey}|${look.angle}|${look.items.map((i) => `${i.product_id}:${i.color_id ?? ""}`).join(",")}`;
    getTryOn(look.resultId)
      .then((job) => {
        if (job.status === "SUCCESS" && job.image_url) {
          setResult({ id: job.id, url: job.image_url, signature: sig, label: `${look.subjectName} · ${angleLabelOf(look.angle)}` });
        } else {
          setNotice("ไม่พบภาพของลุคนี้ กดสร้างภาพใหม่ได้เลย");
        }
      })
      .catch(() => setNotice("ไม่พบภาพของลุคนี้ กดสร้างภาพใหม่ได้เลย"));
  };

  const hint = generating
    ? "กรุณารอสักครู่ ห้ามปิดหน้านี้"
    : !subject
    ? "เลือกโมเดลหรือใช้รูปของคุณเพื่อเริ่ม"
    : garments.length === 0
      ? "เลือกสินค้าอย่างน้อย 1 ชิ้นเพื่อเริ่ม"
      : resultStale
        ? "ตัวเลือกเปลี่ยนแล้ว กดสร้างภาพใหม่เพื่ออัปเดตภาพ"
        : `พร้อมสร้างภาพ ${garments.length} ชิ้น`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="text-left">
        <h1 className="text-3xl font-bold text-secondary md:text-4xl">Try-On Studio</h1>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* แถบซ้าย — scroll ในตัวเองบนจอใหญ่ */}
        {/* แถบซ้าย — เลือกเสื้อผ้าอย่างเดียว; หัวแท็บตรึงอยู่ รายการสินค้าเลื่อนในตัวเอง */}
        <aside className="flex flex-col rounded-[28px] border border-[#E0D5C7] bg-white p-6 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:self-start">
          <GarmentPicker
            products={products}
            error={productsError}
            selectedIds={selectedIds}
            onToggle={toggleGarment}
            colorSelection={colorSelection}
            angle={angle}
            disabled={generating}
          />
        </aside>

        <main className="lg:sticky lg:top-6 lg:self-start">
          <TryOnCanvas
            subject={pending?.subject ?? subject}
            angle={pending?.angle ?? angle}
            garments={pending?.garments ?? garments}
            onRemove={removeGarment}
            colorSelection={pending?.colorSelection ?? colorSelection}
            onColorChange={changeColor}
            resultUrl={pending ? null : resultUrl}
            resultLabel={result?.label}
            generating={generating}
            choosing={mode === null}
            onPickMode={handleModeChange}
            header={
              mode !== null && (
                <ModelPicker
                  mode={mode}
                  onModeChange={handleModeChange}
                  subject={subject}
                  angle={angle}
                  onSubjectChange={handleSubjectChange}
                  onAngleChange={handleAngleChange}
                  requestedSubject={requestedSubject}
                  disabled={generating}
                />
              )
            }
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="mt-5 w-full rounded-full bg-[#3B2C25] py-4 text-lg font-semibold text-white transition hover:bg-[#2A1F1A] disabled:cursor-not-allowed disabled:bg-[#B0AAA6]"
          >
            {generating ? "กำลังสร้างภาพ..." : resultUrl ? "สร้างภาพใหม่ (AI)" : "สร้างภาพสวมใส่ (AI)"}
          </button>
          {resultUrl && !generating && <ResultActions jobId={result!.id} url={resultUrl} label={result?.label} />}
          {canSaveLook && (
            <div className="mt-3">
              {savingName === null ? (
                <button
                  type="button"
                  onClick={() => setSavingName(`ลุค ${looks.length + 1}`)}
                  disabled={alreadySaved}
                  className="w-full rounded-full border border-[#3B2C25] bg-white py-3 text-sm font-semibold text-[#3B2C25] transition hover:bg-[#3B2C25] hover:text-white disabled:cursor-not-allowed disabled:border-[#D9CFC2] disabled:text-[#B0AAA6] disabled:hover:bg-white disabled:hover:text-[#B0AAA6]"
                >
                  {alreadySaved ? "บันทึกลุคนี้แล้ว" : "บันทึกเป็นลุค/ชุด"}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveLook();
                  }}
                  className="flex gap-2"
                >
                  <input
                    autoFocus
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    maxLength={40}
                    placeholder="ตั้งชื่อลุค"
                    className="min-w-0 flex-1 rounded-full border border-[#D9CFC2] bg-white px-4 py-2.5 text-sm text-[#332F29] outline-none focus:border-[#3B2C25]"
                  />
                  <button type="submit" className="rounded-full bg-[#3B2C25] px-5 py-2.5 text-sm font-semibold text-white">
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingName(null)}
                    className="rounded-full border border-[#D9CFC2] bg-white px-4 py-2.5 text-sm text-[#332F29]"
                  >
                    ยกเลิก
                  </button>
                </form>
              )}
            </div>
          )}
          <p className="mt-3 text-center text-sm text-[#8A7F72]">{notice || hint}</p>
        </main>
      </div>

      {user && (
        <SavedLooks
          looks={looks}
          products={products}
          disabled={generating}
          onApply={applyLook}
          onRemove={(look) => dispatch(removeLook({ userId: user.id, lookId: look.id }))}
        />
      )}
    </div>
  );
}
