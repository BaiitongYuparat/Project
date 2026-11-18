import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { getProducts, type Product } from "../../../services/productService";
import ModelPicker from "../../../components/tryon/ModelPicker";
import GarmentPicker from "../../../components/tryon/GarmentPicker";
import TryOnCanvas from "../../../components/tryon/TryOnCanvas";
import {
  ANGLES,
  colorOf,
  slotOf,
  type Angle,
  type ColorSelection,
  type GarmentSlot,
  type TryOnSubject,
} from "../../../components/tryon/types";
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

export default function TryOnPage() {
  const location = useLocation();
  const preset = location.state as { productId?: string; colorId?: string } | null;
  const presetProductId = preset?.productId;
  const requireAuth = useRequireAuth();

  const [subject, setSubject] = useState<TryOnSubject | null>(null);
  const [angle, setAngle] = useState<Angle>("front");

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
  const [result, setResult] = useState<{ url: string; signature: string; label: string } | null>(null);
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

  // ออกจากหน้า → หยุด poll
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSubjectChange = (next: TryOnSubject | null) => {
    if (!generatingRef.current) setSubject(next);
  };

  const handleAngleChange = (next: Angle) => {
    if (!generatingRef.current) setAngle(next);
  };

  const toggleGarment = (product: Product) => {
    if (generatingRef.current) return;
    setNotice("");
    setSelectedIds((prev) => {
      if (prev.includes(product.id)) return prev.filter((id) => id !== product.id);

      const blocked = CONFLICTS[slotOf(product.category)];
      const kept = prev.filter((id) => {
        const other = productById.get(id);
        return !other || !blocked.includes(slotOf(other.category));
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
      const job = await startTryOn({
        view: angle,
        source: subject.key === "me" ? { type: "body" } : { type: "model", model_id: subject.key.replace(/^model:/, "") },
        items: items.map(({ product_id, color_id }) => (color_id ? { product_id, color_id } : { product_id })),
        // กดซ้ำตอนมีผลของชุดนี้อยู่แล้ว = ขอภาพใหม่ ไม่ใช่ขอภาพเดิม
        regenerate: !!resultUrl,
      });
      // ผลเดิมจาก cache ตอบ SUCCESS ทันที ไม่ต้อง poll
      const done =
        job.status === "SUCCESS" ? await getTryOn(job.id) : await waitForTryOn(job.id, controller.signal);

      if (done.status === "SUCCESS" && done.image_url) {
        const angleLabel = ANGLES.find((a) => a.key === angle)?.label ?? angle;
        setResult({ url: done.image_url, signature, label: `${subject.name} · ${angleLabel}` });
      } else {
        setNotice(failedJobMessage(done.error_code));
      }
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
        setPending(null);
        setGenerating(false);
      }
    }
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
        <aside className="rounded-[28px] border border-[#E0D5C7] bg-white p-6 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          <ModelPicker
            subject={subject}
            angle={angle}
            onSubjectChange={handleSubjectChange}
            onAngleChange={handleAngleChange}
            disabled={generating}
          />
          <hr className="my-6 border-[#E7E0D5]" />
          <GarmentPicker
            products={products}
            error={productsError}
            selectedIds={selectedIds}
            onToggle={toggleGarment}
            colorSelection={colorSelection}
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
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="mt-5 w-full rounded-full bg-[#3B2C25] py-4 text-lg font-semibold text-white transition hover:bg-[#2A1F1A] disabled:cursor-not-allowed disabled:bg-[#B0AAA6]"
          >
            {generating ? "กำลังสร้างภาพ..." : resultUrl ? "สร้างภาพใหม่ (AI)" : "สร้างภาพสวมใส่ (AI)"}
          </button>
          <p className="mt-3 text-center text-sm text-[#8A7F72]">{notice || hint}</p>
        </main>
      </div>
    </div>
  );
}
