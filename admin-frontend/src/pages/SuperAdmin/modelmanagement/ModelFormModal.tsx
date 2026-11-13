import { useEffect, useRef, useState } from "react";
import type { Model, ModelFormData, Gender, ImageSlot } from "../../../types/model";
import Switch from "../../../components/Switch";
import Button from "../../../components/Button";

const SIZE_OPTIONS = ["S", "M", "L", "XL" , "XXL"];

/** สล็อตรูป 4 มุม — หน้าเป็นสล็อตบังคับ */
const IMAGE_SLOTS: { slot: ImageSlot; label: string; required: boolean }[] = [
  { slot: "image_front", label: "หน้า", required: true },
  { slot: "image_back", label: "หลัง", required: false },
  { slot: "image_left", label: "ซ้าย", required: false },
  { slot: "image_right", label: "ขวา", required: false },
];

const EMPTY_FORM: ModelFormData = {
  name: "",
  gender: "",
  bust: "",
  waist: "",
  hips: "",
  height: "",
  supported_sizes: [],
  is_selectable: true,
  images: {},
  removedImages: [],
};

/** ค่าเริ่มต้นของโหมดแก้ไข — เติมจากโมเดลที่เลือก */
const toFormValue = (model: Model): ModelFormData => ({
  name: model.name,
  gender: model.gender ?? "",
  bust: model.bust === null ? "" : String(model.bust),
  waist: model.waist === null ? "" : String(model.waist),
  hips: model.hips === null ? "" : String(model.hips),
  height: model.height === null ? "" : String(model.height),
  supported_sizes: model.supported_sizes,
  is_selectable: model.is_selectable,
  images: {},
  removedImages: [],
});

const initialPreviews = (model?: Model | null): Record<ImageSlot, string | null> => ({
  image_front: model?.image_front ?? null,
  image_back: model?.image_back ?? null,
  image_left: model?.image_left ?? null,
  image_right: model?.image_right ?? null,
});

interface ModelFormModalProps {
  mode: "create" | "edit";
  model?: Model | null;
  loading: boolean;
  error: string | null;
  onSubmit: (data: ModelFormData) => void;
  onClose: () => void;
}

/**
 * โมดัลเพิ่ม/แก้ไขโมเดล — mount ครั้งเดียวต่อการเปิด (parent ใส่ key ตอนเปิด)
 * state จึง seed จาก props ได้โดยตรง ไม่ต้อง reset ด้วย effect
 */
export default function ModelFormModal({
  mode,
  model,
  loading,
  error,
  onSubmit,
  onClose,
}: ModelFormModalProps) {
  const [form, setForm] = useState<ModelFormData>(() =>
    mode === "edit" && model ? toFormValue(model) : EMPTY_FORM
  );
  const [previews, setPreviews] = useState<Record<ImageSlot, string | null>>(() =>
    initialPreviews(model)
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  // เก็บ blob URL ต่อมุมเพื่อ revoke ตอนปิดโมดัล
  const blobUrlsRef = useRef<Partial<Record<ImageSlot, string>>>({});

  useEffect(() => {
    const blobUrls = blobUrlsRef.current;
    return () => {
      for (const url of Object.values(blobUrls)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  const set = <K extends keyof ModelFormData>(key: K, value: ModelFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePickFile = (slot: ImageSlot, file: File | undefined) => {
    if (!file) return;
    set("images", { ...form.images, [slot]: file });
    set("removedImages", form.removedImages.filter((s) => s !== slot));
    if (blobUrlsRef.current[slot]) {
      URL.revokeObjectURL(blobUrlsRef.current[slot] as string);
    }
    const url = URL.createObjectURL(file);
    blobUrlsRef.current[slot] = url;
    setPreviews((prev) => ({ ...prev, [slot]: url }));
  };

  const clearSlot = (slot: ImageSlot) => {
    set("images", { ...form.images, [slot]: undefined });
    if (blobUrlsRef.current[slot]) {
      URL.revokeObjectURL(blobUrlsRef.current[slot] as string);
      blobUrlsRef.current[slot] = undefined;
    }
    setPreviews((prev) => ({ ...prev, [slot]: mode === "edit" ? model?.[slot] ?? null : null }));
    // โหมดแก้ไข: บอก backend ว่าต้องการล้างรูปเดิมของมุมนี้
    if (mode === "edit" && model?.[slot]) {
      if (!form.removedImages.includes(slot)) {
        set("removedImages", [...form.removedImages, slot]);
      }
    }
  };

  const toggleSize = (size: string) => {
    set(
      "supported_sizes",
      form.supported_sizes.includes(size)
        ? form.supported_sizes.filter((s) => s !== size)
        : [...form.supported_sizes, size].sort(
            (a, b) => SIZE_OPTIONS.indexOf(a) - SIZE_OPTIONS.indexOf(b)
          )
    );
  };

  /** validate ฝั่ง client ก่อนส่ง — error จาก server แสดงผ่าน props.error */
  const handleSubmit = () => {
    const errors: string[] = [];
    if (!form.name.trim()) errors.push("กรุณากรอกชื่อโมเดล");
    if (!form.height.trim()) errors.push("กรุณากรอกส่วนสูง");
    for (const [label, value] of [
      ["ส่วนสูง", form.height],
      ["รอบอก", form.bust],
      ["รอบเอว", form.waist],
      ["รอบสะโพก", form.hips],
    ] as const) {
      if (value.trim() !== "" && !Number.isFinite(Number(value))) {
        errors.push(`${label}ต้องเป็นตัวเลข`);
      }
    }
    const frontFile = form.images.image_front;
    // โหมดแก้ไข: ต้องมีไฟล์ใหม่ หรือคงรูปเดิมไว้ (ล้างแล้วไม่เลือกใหม่ = ไม่ผ่าน)
    // โหมดสร้าง: ต้องมีไฟล์ด้านหน้าเสมอ
    const frontMissing =
      mode === "edit"
        ? !frontFile &&
          (form.removedImages.includes("image_front") || !model?.image_front)
        : !frontFile;
    if (frontMissing) {
      errors.push("กรุณาเลือกรูปด้านหน้า");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    onSubmit(form);
  };

  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:bg-stone-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={loading ? undefined : onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            {mode === "create" ? "เพิ่มโมเดล" : "แก้ไขโมเดล"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="ปิดหน้าต่าง"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row">
          {/* Dropzone 4 มุม */}
          <div className="grid w-full grid-cols-2 gap-3 sm:w-64">
            {IMAGE_SLOTS.map(({ slot, label, required }) => (
              <div key={slot} className="relative">
                <button
                  type="button"
                  onClick={() => document.getElementById(`model-image-${slot}`)?.click()}
                  disabled={loading}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 transition-colors hover:border-admin-400 hover:bg-stone-100"
                >
                  {previews[slot] ? (
                    <img
                      src={previews[slot] as string}
                      alt={`รูปด้าน${label}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <>
                      <svg className="h-5 w-5 text-stone-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 15.5h12" />
                      </svg>
                      <span className="text-xs font-medium text-stone-700">ด้าน{label}</span>
                      {required && <span className="text-[10px] text-stone-400">จำเป็น</span>}
                    </>
                  )}
                </button>
                {previews[slot] && (
                  <button
                    type="button"
                    onClick={() => clearSlot(slot)}
                    disabled={loading}
                    aria-label={`ล้างรูปด้าน${label}`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-stone-500 shadow hover:text-red-600"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                  </button>
                )}
                <input
                  id={`model-image-${slot}`}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handlePickFile(slot, e.target.files?.[0])}
                />
              </div>
            ))}
            <p className="col-span-2 text-center text-xs text-stone-400">
              JPG / PNG — เลือกได้ทั้ง 4 มุม เลือกเฉพาะหน้าก็พอ
            </p>
          </div>

          {/* ฟอร์ม */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-stone-600">ชื่อโมเดล</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-stone-600">เพศ</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value as Gender | "")}
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="MALE">ชาย</option>
                  <option value="FEMALE">หญิง</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-stone-600">ส่วนสูง (ซม.)</label>
                <input
                  value={form.height}
                  onChange={(e) => set("height", e.target.value)}
                  inputMode="decimal"
                  disabled={loading}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-stone-600">ซัดส่วน (ซม.)</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    value={form.bust}
                    onChange={(e) => set("bust", e.target.value)}
                    placeholder="อก"
                    inputMode="decimal"
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    value={form.waist}
                    onChange={(e) => set("waist", e.target.value)}
                    placeholder="เอว"
                    inputMode="decimal"
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    value={form.hips}
                    onChange={(e) => set("hips", e.target.value)}
                    placeholder="สะโพก"
                    inputMode="decimal"
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-stone-600">ไซส์ที่รองรับ</label>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map((size) => {
                  const selected = form.supported_sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      disabled={loading}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-admin-600 bg-admin-600 text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:border-admin-400"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3">
              <Switch
                checked={form.is_selectable}
                onChange={(v) => set("is_selectable", v)}
                label="เปิดใช้สำหรับลูกค้าทันที"
                disabled={loading}
                color="sage"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {(formErrors.length > 0 || error) && (
          <ul className="mt-4 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {(formErrors.length > 0 ? formErrors : [error ?? ""]).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="cream-outline" onClick={onClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="button" variant="cream" onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </div>
    </div>
  );
}
