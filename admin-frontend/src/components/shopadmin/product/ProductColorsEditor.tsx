import { useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  addOutline,
  cloudUploadOutline,
  imageOutline,
  trashOutline,
} from "ionicons/icons";

import type {
  ImageView,
  ProductColorForm,
  ProductPiece,
} from "../../../types/product";

interface ProductColorsEditorProps {
  colors: ProductColorForm[];
  // หมวดสินค้า — ใช้แสดงตัวเลือกชนิดรูปของสินค้าแบบชุด เช่น set
  category?: string;
  onAddColor: () => void;
  onUpdateColor: (index: number, patch: Partial<ProductColorForm>) => void;
  onRemoveColor: (index: number) => void;
  onImageChange: (
    colorIndex: number,
    view: ImageView,
    file: File | undefined,
  ) => void;
  onImagePieceChange?: (
    colorIndex: number,
    view: ImageView,
    piece: ProductPiece,
  ) => void;
  onRemoveExistingImage: (colorIndex: number, imageId: string) => void;
  onRemoveNewImage: (colorIndex: number, imageIndex: number) => void;
}

const imageViews: { key: ImageView; label: string }[] = [
  { key: "FRONT", label: "ด้านหน้า" },
  { key: "BACK", label: "ด้านหลัง" },
  { key: "LEFT", label: "ด้านซ้าย" },
  { key: "RIGHT", label: "ด้านขวา" },
];

const hasFrontImage = (color: ProductColorForm) => {
  const hasNewFront = color.new_images.some(
    (image) => image.view === "FRONT",
  );

  const hasExistingFront = color.existing_images.some(
    (image) =>
      image.view === "FRONT" && !color.removed_image_ids.includes(image.id),
  );

  return hasNewFront || hasExistingFront;
};

// ส่วนแก้ไขสี & รูปสินค้า (เดิมอยู่ใน modal — ตอนนี้ฝังใน step 3 ของ wizard)
export default function ProductColorsEditor({
  colors,
  category,
  onAddColor,
  onUpdateColor,
  onRemoveColor,
  onImageChange,
  onImagePieceChange,
  onRemoveExistingImage,
  onRemoveNewImage,
}: ProductColorsEditorProps) {
  const [rawActiveIndex, setActiveColorIndex] = useState(0);
  const [selectedSetPiece, setSelectedSetPiece] =
    useState<ProductPiece>("SET");

  // clamp index กันสีที่เลือกถูกลบไป
  const activeColorIndex = Math.min(
    rawActiveIndex,
    Math.max(colors.length - 1, 0),
  );

  const activeColor = colors[activeColorIndex] ?? null;

  // Preview รูปใหม่ทุกสี (สร้าง object URL ครั้งเดียวต่อไฟล์)
  const previews = useMemo(() => {
    const map = new Map<File, string>();

    colors.forEach((color) => {
      color.new_images.forEach(({ file }) => {
        if (!map.has(file)) {
          map.set(file, URL.createObjectURL(file));
        }
      });
    });

    return map;
  }, [colors]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const getImageByView = (color: ProductColorForm, view: ImageView) => {
    const newImageIndex = color.new_images.findIndex(
      (image) => image.view === view,
    );

    if (newImageIndex !== -1) {
      const image = color.new_images[newImageIndex];

      return {
        url: previews.get(image.file),
        isNew: true,
        newImageIndex,
        piece: image.piece ?? null,
        existingImage: null as (typeof color.existing_images)[number] | null,
        status: "PENDING",
      };
    }

    const existingImage = color.existing_images.find(
      (image) =>
        image.view === view && !color.removed_image_ids.includes(image.id),
    );

    if (existingImage) {
      return {
        url: existingImage.image_url,
        isNew: false,
        newImageIndex: -1,
        piece: existingImage.piece ?? null,
        existingImage,
        status: existingImage.quality_status,
      };
    }

    return null;
  };

  const missingFrontColors = colors.filter(
    (color) => !color.legacy && !hasFrontImage(color),
  );

  const setPieceLabels: Record<ProductPiece, string> = {
    SET: "รูปเต็มชุด (SET)",
    TOP: "รูปท่อนบน (TOP)",
    BOTTOM: "รูปท่อนล่าง (BOTTOM)",
  };

  const handleUploadImage = (
    colorIndex: number,
    view: ImageView,
    file: File | undefined,
  ) => {
    if (!file) return;

    onImageChange(colorIndex, view, file);

    if (category === "set") {
      onImagePieceChange?.(colorIndex, view, selectedSetPiece);
    }
  };

  const setSteps: ProductPiece[] = ["SET", "TOP", "BOTTOM"];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9DFC9] bg-white">
      <div className="flex flex-col justify-center items-center border-b border-[#EFE7D8] px-6 py-4">
        <p className="text-sm font-medium text-[#332F29]">
          เพิ่มสีและอัปโหลดรูป 4 มุม ต่อ 1 สี (ด้านหน้า ด้านหลัง ด้านซ้าย
          ด้านขวา)
        </p>
      </div>

      <div className="flex min-h-0 flex-col md:flex-row">
        {/* Color list */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#EFE7D8] bg-[#FCFAF6] p-4 md:w-56 md:flex-col md:border-b-0 md:border-r">
          {colors.map((color, index) => (
            <button
              key={color.id ?? `new-${index}`}
              type="button"
              onClick={() => setActiveColorIndex(index)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors md:w-full ${
                index === activeColorIndex
                  ? "border-[#87947A] bg-white font-medium text-[#332F29]"
                  : "border-[#E9DFC9] bg-white/60 text-[#786E5D] hover:border-[#87947A]"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-[#EFE7D8]"
                style={{ backgroundColor: color.hex || "#EFE7D8" }}
              />

              <span className="truncate">
                {color.legacy ? "ไม่ระบุสี (รูปเดิม)" : color.name || "สีใหม่"}
              </span>

              {color.legacy && (
                <span className="ml-auto text-xs text-[#A39988]">
                  {color.existing_images.length - color.removed_image_ids.length}
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={onAddColor}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#DCCFB8] px-3 py-2 text-sm text-[#6B7A5E] hover:bg-[#F8F4EA] md:w-full"
          >
            <IonIcon icon={addOutline} />
            เพิ่มสี
          </button>
        </div>

        {/* Active color editor */}
        <div className="min-w-0 flex-1 p-6">
          {activeColor ? (
            <div className="space-y-5">
              {/* Color info */}
              {!activeColor.legacy ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#332F29]">
                      ชื่อสี <span className="text-red-500">*</span>
                    </span>

                    <input
                      type="text"
                      value={activeColor.name}
                      onChange={(event) =>
                        onUpdateColor(activeColorIndex, {
                          name: event.target.value,
                        })
                      }
                      placeholder="เช่น Black, Beige"
                      className="w-full rounded-lg border border-[#E9DFC9] px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#332F29]">
                      โค้ดสี
                    </span>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeColor.hex || "#000000"}
                        onChange={(event) =>
                          onUpdateColor(activeColorIndex, {
                            hex: event.target.value,
                          })
                        }
                        className="h-10 w-12 cursor-pointer rounded-lg border border-[#E9DFC9] bg-white p-1"
                      />

                      <input
                        type="text"
                        value={activeColor.hex}
                        onChange={(event) =>
                          onUpdateColor(activeColorIndex, {
                            hex: event.target.value,
                          })
                        }
                        placeholder="#000000"
                        className="w-full rounded-lg border border-[#E9DFC9] px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
                      />
                    </div>
                  </label>
                </div>
              ) : (
                <p className="rounded-xl bg-[#FCFAF6] p-4 text-sm text-[#8B806E]">
                  รูปภาพสินค้าเดิมที่ยังไม่ได้ระบุสี — เพิ่มสีใหม่แล้วย้ายรูป
                  หรือลบรูปเดิมออกเพื่อจัดระเบียบสินค้า
                </p>
              )}

              {/* 4 views upload */}
              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium text-[#332F29]">
                    รูปภาพสินค้า (4 มุม)
                  </p>

                  <p className="mt-1 text-xs text-[#8B806E]">
                    ต้องมีรูปภาพด้านหน้าอย่างน้อย 1 รูปต่อสี
                    เพื่อใช้งาน Virtual Try-On
                  </p>

                  {category === "set" && (
                    <div className="mt-3 rounded-xl border border-[#DCCFB8] bg-[#F8F4EA] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7A5E]">
                        ต้องอัปโหลดแบบบังคับ
                      </p>

                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {setSteps.map((piece) => (
                          <button
                            key={piece}
                            type="button"
                            onClick={() => setSelectedSetPiece(piece)}
                            className={`rounded-xl border px-3 py-2 text-left text-[11px] font-medium transition-colors ${
                              selectedSetPiece === piece
                                ? "border-[#87947A] bg-[#E9F0E3] text-[#332F29]"
                                : "border-[#DCCFB8] bg-white text-[#6B7A5E]"
                            }`}
                          >
                            {setPieceLabels[piece]}
                          </button>
                        ))}
                      </div>

                      <p className="mt-2 text-[11px] text-[#6B7A5E]">
                        ขั้นตอนที่กำลังเลือก:{" "}
                        <span className="font-semibold text-[#332F29]">
                          {setPieceLabels[selectedSetPiece]}
                        </span>
                      </p>
                    </div>
                  )}

                  {category === "set" && (
                    <p className="mt-1 text-xs text-[#6B7A5E]">
                      ชุด (Set): อัปโหลดรูป 4 ด้านตามลำดับ{" "}
                      <span className="font-semibold">SET → TOP → BOTTOM</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {imageViews.map((view) => {
                    const image = getImageByView(activeColor, view.key);

                    return (
                      <div
                        key={view.key}
                        className="rounded-xl border border-[#E9DFC9] bg-[#FCFAF6] p-3"
                      >
                        <p className="mb-2 text-sm font-medium text-[#332F29]">
                          {view.label}
                        </p>

                        {image?.url ? (
                          <div className="relative">
                            <img
                              src={image.url}
                              alt={view.label}
                              className="aspect-square w-full rounded-lg object-cover"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                image.isNew
                                  ? onRemoveNewImage(
                                      activeColorIndex,
                                      image.newImageIndex,
                                    )
                                  : onRemoveExistingImage(
                                      activeColorIndex,
                                      image.existingImage!.id,
                                    )
                              }
                              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                              aria-label="ลบรูปภาพ"
                            >
                              <IonIcon icon={trashOutline} className="text-sm" />
                            </button>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-[#8B806E]">
                                {image.status === "PASSED"
                                  ? "ผ่านการตรวจสอบ"
                                  : image.status === "FAILED"
                                    ? "ไม่ผ่านการตรวจสอบ"
                                    : "กำลังตรวจสอบ..."}
                              </span>

                              <label className="cursor-pointer rounded-lg bg-[#3B2C25] px-3 py-1.5 text-xs text-white hover:bg-[#2A201B]">
                                เปลี่ยนรูป
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => {
                                    handleUploadImage(
                                      activeColorIndex,
                                      view.key,
                                      event.target.files?.[0],
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            {category === "set" && image.isNew && (
                              <div className="mt-2 rounded-lg border border-[#EFE7D8] bg-white px-2 py-1.5 text-[11px] text-[#6B7A5E]">
                                {image.piece
                                  ? `ประเภท: ${setPieceLabels[image.piece]}`
                                  : "ยังไม่ได้ระบุประเภทรูป"}
                              </div>
                            )}

                            {image.status === "FAILED" &&
                              !image.isNew &&
                              image.existingImage && (
                                <p className="mt-1 text-xs text-red-500">
                                  {image.existingImage.quality_reason ||
                                    "กรุณาเปลี่ยนรูปภาพ"}
                                </p>
                              )}
                          </div>
                        ) : (
                          <div className="flex aspect-square cursor-pointer flex-col justify-center rounded-lg border-2 border-dashed border-[#DCCFB8] bg-[#F8F4EA] p-3 hover:border-[#87947A]">
                            <label className="flex flex-1 cursor-pointer flex-col items-center justify-center text-center">
                              <IonIcon
                                icon={cloudUploadOutline}
                                className="mb-2 text-3xl text-[#6B7A5E]"
                              />

                              <span className="text-xs text-[#8B806E]">
                                {category === "set"
                                  ? `อัปโหลด ${setPieceLabels[selectedSetPiece]}`
                                  : "คลิกเพื่ออัปโหลด"}
                              </span>

                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  handleUploadImage(
                                    activeColorIndex,
                                    view.key,
                                    event.target.files?.[0],
                                  );
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Remove color */}
              {!activeColor.legacy && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveColor(activeColorIndex)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <IonIcon icon={trashOutline} />
                    ลบสีนี้
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-10 text-[#A39988]">
              <IonIcon icon={imageOutline} className="text-4xl" />

              <p className="mt-3 text-sm">
                กด "เพิ่มสี" เพื่อเริ่มเพิ่มรูปสินค้า
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-[#EFE7D8] bg-[#FCFAF6] px-6 py-3">
        {missingFrontColors.length > 0 ? (
          <p className="text-xs text-red-500">
            ยังขาดรูปด้านหน้า: {" "}
            {missingFrontColors.map((color) => color.name || "สีใหม่").join(", ")}
          </p>
        ) : (
          <p className="text-xs text-[#8B806E]">
            {colors.filter((color) => !color.legacy).length} สี
          </p>
        )}
      </div>
    </div>
  );
}
