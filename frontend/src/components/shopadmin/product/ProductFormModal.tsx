import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { IonIcon } from "@ionic/react";
import {
  closeOutline,
  cloudUploadOutline,
  imageOutline,
  trashOutline,
} from "ionicons/icons";

import Button from "../../Button";
import Input from "../../Input";

import type {
  ImageView,
  Product,
  ProductFormData,
} from "../../../types/product";

interface ProductFormModalProps {
  editingProduct: Product | null;
  form: ProductFormData;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onImageChange: (
    event: ChangeEvent<HTMLInputElement>,
    view: "FRONT" | "BACK" | "LEFT" | "RIGHT",
  ) => void;
  onRemoveOldImage: (imageId: string) => void;
  onRemoveNewImage: (index: number) => void;
}
const CATEGORY_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "accessories", label: "Accessories" },
];
const imageViews: {
  key: ImageView;
  label: string;
}[] = [
  { key: "FRONT", label: "ด้านหน้า" },
  { key: "BACK", label: "ด้านหลัง" },
  { key: "LEFT", label: "ด้านซ้าย" },
  { key: "RIGHT", label: "ด้านขวา" },
];

export default function ProductFormModal({
  editingProduct,
  form,
  saving,
  onClose,
  onSubmit,
  onChange,
  onImageChange,
  onRemoveOldImage,
  onRemoveNewImage,
}: ProductFormModalProps) {
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  // สร้าง Preview สำหรับรูปภาพใหม่
  useEffect(() => {
    const previews = form.images.map((image) =>
      URL.createObjectURL(image.file),
    );

    setNewImagePreviews(previews);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [form.images]);

  // รูปภาพเดิมที่ยังไม่ได้เลือกลบ
  const existingImages =
    editingProduct?.images.filter(
      (image) => !form.remove_image_ids.includes(image.id),
    ) ?? [];

  const getImageByView = (view: ImageView) => {
    const newImage = form.images.find((image) => image.view === view);

    if (newImage) {
      const index = form.images.indexOf(newImage);

      return {
        url: newImagePreviews[index],
        isNew: true,
        index,
        status: "PENDING",
      };
    }

    const oldImage = existingImages.find((image) => image.view === view);

    if (oldImage) {
      return {
        url: oldImage.image_url,
        isNew: false,
        image: oldImage,
        status: oldImage.quality_status,
      };
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFE7D8] px-6 py-5">
          <div className="flex flex-col justify-center w-full items-center">
            <h2 className="text-lg font-semibold text-[#332F29]">
              {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
            </h2>

            <p className="mt-1 text-sm text-[#8B806E]">
              กรอกข้อมูลสินค้าและเพิ่มรูปภาพสำหรับระบบ Virtual Try-On
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#8B806E] hover:bg-[#F8F4EA]"
            aria-label="ปิดหน้าต่าง"
          >
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="overflow-y-auto">
          <div className="space-y-5 p-6">
            {/* Product Name */}
            <Input
              label="ชื่อสินค้า"
              name="name"
              value={form.name}
              onChange={onChange}
              required
              placeholder="เช่น เสื้อเชิ้ตแขนยาว"
            />

            {/* SKU and Category */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="SKU"
                name="sku"
                value={form.sku}
                onChange={onChange}
                placeholder="รหัสสินค้า"
              />

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#332F29]">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </span>

                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  required
                  className="w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2453D4]"
                >
                  <option value="" disabled>
                    เลือกหมวดหมู่
                  </option>

                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Price */}
            <Input
              label="ราคา (บาท)"
              name="price"
              type="number"
              value={form.price ?? ""}
              onChange={onChange}
              min="0"
              step="0.01"
              placeholder="0.00"
            />

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#332F29]">
                รายละเอียดสินค้า
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={3}
                placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า..."
                className="w-full resize-none rounded-xl border border-[#E9DFC9] px-4 py-3 text-sm outline-none focus:border-[#2453D4]"
              />
            </div>

            {/* Product Images */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-[#332F29]">
                  รูปภาพสินค้า
                </label>

                <span className="text-xs text-[#8B806E]">
                  {existingImages.length + form.images.length}/4 รูป
                </span>
              </div>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-[#8B806E]">รูปภาพปัจจุบัน</p>

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {existingImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.image_url}
                          alt="Product"
                          className="aspect-square w-full rounded-xl border border-[#E9DFC9] object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => onRemoveOldImage(image.id)}
                          className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                          aria-label="ลบรูปภาพ"
                        >
                          <IonIcon icon={trashOutline} className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImagePreviews.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-[#8B806E]">
                    รูปภาพที่เพิ่มใหม่
                  </p>

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {newImagePreviews.map((preview, index) => (
                      <div key={`${preview}-${index}`} className="relative">
                        <img
                          src={preview}
                          alt={`New product ${index + 1}`}
                          className="aspect-square w-full rounded-xl border border-[#E9DFC9] object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => onRemoveNewImage(index)}
                          className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                          aria-label="ลบรูปภาพใหม่"
                        >
                          <IonIcon icon={trashOutline} className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Area - 4 Views */}
              <div>
                <div className="mb-3">
                  <p className="text-sm font-medium text-[#332F29]">
                    รูปภาพสินค้า (4 มุม)
                  </p>
                  <p className="mt-1 text-xs text-[#8B806E]">
                    อัปโหลดรูปภาพด้านหน้า ด้านหลัง ด้านซ้าย และด้านขวา
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {imageViews.map((view) => {
                    const image = getImageByView(view.key);

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

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-[#8B806E]">
                                {image.status === "PASSED"
                                  ? "ผ่านการตรวจสอบ"
                                  : image.status === "FAILED"
                                    ? "ไม่ผ่านการตรวจสอบ"
                                    : "กำลังตรวจสอบ..."}
                              </span>

                              <label className="cursor-pointer rounded-lg bg-[#2453D4] px-3 py-1.5 text-xs text-white hover:bg-[#1D45B5]">
                                เปลี่ยนรูป
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => onImageChange(e, view.key)}
                                />
                              </label>
                            </div>

                            {image.status === "FAILED" && !image.isNew && (
                              <p className="mt-1 text-xs text-red-500">
                                {image.image?.quality_reason ||
                                  "กรุณาเปลี่ยนรูปภาพ"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#DCCFB8] hover:border-[#2453D4] hover:bg-[#F8F4EA]">
                            <IonIcon
                              icon={cloudUploadOutline}
                              className="mb-2 text-3xl text-[#2453D4]"
                            />

                            <span className="text-xs text-[#8B806E]">
                              คลิกเพื่ออัปโหลด
                            </span>

                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => onImageChange(e, view.key)}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-[#8B806E]">
                  <IonIcon icon={imageOutline} className="mr-1 align-middle" />
                  รองรับไฟล์รูปภาพ 4 มุม สูงสุด 4 รูปต่อสินค้า
                </p>
              </div>


            </div>

            {/* Active Status */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#FCFAF6] p-4">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={onChange}
                className="h-4 w-4 accent-[#2453D4]"
              />

              <div className="flex flex-col justify-center items-start ">
                <p className="text-sm font-medium text-[#332F29]">
                  เปิดใช้งานสินค้า
                </p>

                <p className="mt-1 text-xs text-[#8B806E]">
                  สินค้าที่เปิดใช้งานจะแสดงบนหน้าร้าน
                </p>
              </div>
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-[#EFE7D8] bg-[#FCFAF6] px-6 py-4">
            <Button type="button" onClick={onClose} variant="danger">
              ยกเลิก
            </Button>

            <Button type="submit" disabled={saving} variant="secondary">
              {saving
                ? "กำลังบันทึก..."
                : editingProduct
                  ? "บันทึกการแก้ไข"
                  : "เพิ่มสินค้า"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
