import type { ChangeEvent, FormEvent } from "react";
import { IonIcon } from "@ionic/react";
import {
  closeOutline,
  createOutline,
  gridOutline,
  pricetagOutline,
  removeCircleOutline,
  addCircleOutline,
} from "ionicons/icons";

import Button from "../../Button";
import Input from "../../Input";

import { sortChartsForProduct } from "../../../services/ShopAdmin/sizeChartService";
import type {
  BrandSizeChart,
  Product,
  ProductFormData,
  ProductGender,
  ProductOptions,
  SizeChartTemplate,
} from "../../../types/product";

interface ProductFormModalProps {
  editingProduct: Product | null;
  form: ProductFormData;
  saving: boolean;
  options: ProductOptions;
  templates: SizeChartTemplate[];
  charts: BrandSizeChart[];
  activeTemplateId: string | null;
  onClose: () => void;
  onOpenImages: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onGenderChange: (gender: ProductGender) => void;
  onCategoryChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onToggleArrayField: (field: "seasons" | "occasions", value: string) => void;
  onUpdateSizeRow: (
    index: number,
    field: keyof ProductFormData["size_chart"][number],
    value: string,
  ) => void;
  onAddSizeRow: () => void;
  onRemoveSizeRow: (index: number) => void;
  onApplyTemplate: (template: SizeChartTemplate) => void;
  // เลือก/เลิกอ้างอิงตารางกลางของร้าน
  onSizeChartChange: (chartId: string | null) => void;
  // สลับเป็นตารางเฉพาะตัว โดย copy rows จากตารางกลางที่เลือก
  onOverrideFromChart: (chartId: string) => void;
  // ไปหน้าสร้างตารางใหม่ (เซฟ draft ก่อน)
  onGoToNewChart: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "accessories", label: "Accessories" },
];

const GENDER_OPTIONS: { value: ProductGender; label: string }[] = [
  { value: "UNISEX", label: "ทุกเพศ (Unisex)" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

const SIZE_MEASURE_COLUMNS: {
  field: keyof ProductFormData["size_chart"][number];
  label: string;
}[] = [
  { field: "chest", label: "รอบอก (ซม.)" },
  { field: "waist", label: "รอบเอว (ซม.)" },
  { field: "hips", label: "รอบสะโพก (ซม.)" },
  { field: "length", label: "ความยาว (ซม.)" },
];

// หมวดหมู่ที่ต้องมีตารางไซส์
const requiresSizeChart = (category: string) => category !== "accessories";

export default function ProductFormModal({
  editingProduct,
  form,
  saving,
  options,
  templates,
  charts,
  activeTemplateId,
  onClose,
  onOpenImages,
  onSubmit,
  onChange,
  onGenderChange,
  onCategoryChange,
  onToggleArrayField,
  onUpdateSizeRow,
  onAddSizeRow,
  onRemoveSizeRow,
  onApplyTemplate,
  onSizeChartChange,
  onOverrideFromChart,
  onGoToNewChart,
}: ProductFormModalProps) {
  // สรุปสถานะสี/รูปสำหรับปุ่มเปิด modal รูป
  const realColors = form.colors.filter((color) => !color.legacy);
  const legacyImages = form.colors.find((color) => color.legacy);

  const colorsSummary = realColors.length
    ? `${realColors.length} สี`
    : "ยังไม่มีสี";

  const imagesSummary = [
    ...realColors.flatMap(
      (color) =>
        color.existing_images.filter(
          (image) => !color.removed_image_ids.includes(image.id),
        ).length + color.new_images.length,
    ),
    ...(legacyImages
      ? [
          legacyImages.existing_images.filter(
            (image) => !legacyImages.removed_image_ids.includes(image.id),
          ).length,
        ]
      : []),
  ].reduce((sum, count) => sum + count, 0);

  // ตารางกลางของร้าน เรียงให้ตัวที่ตรงเพศ/หมวดขึ้นก่อน (ตัวช่วยกรอง ไม่ block)
  const sortedCharts = sortChartsForProduct(charts, form.gender, form.category);

  // ตารางกลางที่ถูกเลือกอยู่ + entry ของหมวดปัจจุบัน (สำหรับ preview)
  const selectedChart = form.size_chart_id
    ? charts.find((chart) => chart.id === form.size_chart_id) ?? null
    : null;
  const selectedEntry =
    selectedChart?.entries.find(
      (entry) => entry.category === form.category,
    ) ?? null;

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
              กรอกข้อมูลสินค้า ตารางไซส์ และจัดการรูปแยกตามสี
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
                  onChange={onCategoryChange}
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

            {/* Gender */}
            <div>
              <span className="mb-2 block text-sm font-medium text-[#332F29]">
                เพศสินค้า
              </span>

              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={form.gender === option.value}
                    onClick={() => onGenderChange(option.value)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      form.gender === option.value
                        ? "bg-[#2453D4] font-medium text-white"
                        : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric */}
            <Input
              label="เนื้อผ้า"
              name="fabric"
              value={form.fabric}
              onChange={onChange}
              placeholder="เช่น ผ้าฝ้าย 100%, Polyester"
            />

            {/* Seasons */}
            <div>
              <span className="mb-2 block text-sm font-medium text-[#332F29]">
                ฤดู (เลือกได้หลายค่า)
              </span>

              <div className="flex flex-wrap gap-2">
                {options.seasons.map((season) => (
                  <button
                    key={season}
                    type="button"
                    aria-pressed={form.seasons.includes(season)}
                    onClick={() => onToggleArrayField("seasons", season)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      form.seasons.includes(season)
                        ? "bg-[#2453D4] font-medium text-white"
                        : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                    }`}
                  >
                    {season}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasions */}
            <div>
              <span className="mb-2 block text-sm font-medium text-[#332F29]">
                โอกาสในการใช้งาน (เลือกได้หลายค่า)
              </span>

              <div className="flex flex-wrap gap-2">
                {options.occasions.map((occasion) => (
                  <button
                    key={occasion}
                    type="button"
                    aria-pressed={form.occasions.includes(occasion)}
                    onClick={() => onToggleArrayField("occasions", occasion)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      form.occasions.includes(occasion)
                        ? "bg-[#2453D4] font-medium text-white"
                        : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                    }`}
                  >
                    {occasion}
                  </button>
                ))}
              </div>
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

            {/* Size Chart */}
            <div className="rounded-xl border border-[#E9DFC9] bg-[#FCFAF6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-[#332F29]">
                    <IonIcon icon={gridOutline} />
                    ตารางไซส์
                    {requiresSizeChart(form.category) && (
                      <span className="text-red-500">*</span>
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#8B806E]">
                    {requiresSizeChart(form.category)
                      ? "เลือกตารางไซส์ของร้าน หรือแก้เฉพาะสินค้านี้"
                      : "หมวดหมู่ Accessories ไม่จำเป็นต้องมีตารางไซส์"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onGoToNewChart}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E9DFC9] bg-white px-3 py-2 text-xs text-[#2453D4] hover:bg-[#F8F4EA]"
                >
                  <IonIcon icon={addCircleOutline} />
                  เพิ่มตาราง
                </button>
              </div>

              {/* เลือกตารางกลางของร้าน */}
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-[#8B806E]">
                  ตารางไซส์ของร้าน
                </span>

                <select
                  value={form.size_chart_id ?? ""}
                  onChange={(event) =>
                    onSizeChartChange(event.target.value || null)
                  }
                  className="w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2453D4]"
                >
                  <option value="">
                    — ใช้ตารางเฉพาะสินค้านี้ (แก้เองด้านล่าง) —
                  </option>

                  {sortedCharts.map((chart) => (
                    <option key={chart.id} value={chart.id}>
                      {chart.name} ({chart.gender.toLowerCase()}
                      {chart.entries.length > 0
                        ? ` · ${chart.entries
                            .map((entry) => entry.category)
                            .join(", ")}`
                        : ""}
                      )
                    </option>
                  ))}
                </select>
              </label>

              {selectedChart ? (
                /* โหมดอ้างอิงตารางกลาง — preview read-only */
                <div className="mt-3">
                  {form.category ? (
                    selectedEntry && selectedEntry.rows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                          <thead className="text-xs text-[#786E5D]">
                            <tr>
                              <th className="px-2 py-2 font-medium">ไซส์</th>

                              {SIZE_MEASURE_COLUMNS.map((column) => (
                                <th
                                  key={column.field}
                                  className="px-2 py-2 font-medium"
                                >
                                  {column.label}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-[#F0E8DA]">
                            {selectedEntry.rows.map((row) => (
                              <tr key={row.id ?? row.size}>
                                <td className="px-2 py-2 font-medium text-[#332F29]">
                                  {row.size}
                                </td>

                                {SIZE_MEASURE_COLUMNS.map((column) => (
                                  <td
                                    key={column.field}
                                    className="px-2 py-2 text-[#786E5D]"
                                  >
                                    {row[column.field] === null
                                      ? "-"
                                      : row[column.field]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        ตาราง "{selectedChart.name}" ไม่มีข้อมูลของหมวด "
                        {form.category}" — เลือกตารางอื่น หรือแก้เฉพาะสินค้านี้
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-[#A39988]">
                      เลือกหมวดหมู่ก่อน เพื่อดูตารางไซส์ของหมวดนั้น
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onOverrideFromChart(selectedChart.id)}
                    disabled={
                      !form.category ||
                      !selectedEntry ||
                      selectedEntry.rows.length === 0
                    }
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#2453D4] hover:bg-[#F8F4EA] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IonIcon icon={createOutline} />
                    แก้เฉพาะสินค้านี้ (copy จากตาราง)
                  </button>
                </div>
              ) : (
                /* โหมดตารางเฉพาะตัว — editor inline */
                <div className="mt-3">
                  {templates.length > 0 && (
                    <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-xs text-[#8B806E]">
                        ใช้ตาราง standard
                      </span>

                      <select
                        value={activeTemplateId ?? ""}
                        onChange={(event) => {
                          const template = templates.find(
                            (item) => item.id === event.target.value,
                          );

                          if (template) onApplyTemplate(template);
                        }}
                        className="rounded-lg border border-[#E9DFC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#2453D4]"
                      >
                        <option value="" disabled>
                          เลือกตาราง
                        </option>

                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                            {template.category ? ` (${template.category})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.size_chart.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="text-xs text-[#786E5D]">
                          <tr>
                            <th className="px-2 py-2 font-medium">ไซส์</th>

                            {SIZE_MEASURE_COLUMNS.map((column) => (
                              <th
                                key={column.field}
                                className="px-2 py-2 font-medium"
                              >
                                {column.label}
                              </th>
                            ))}

                            <th className="px-2 py-2" />
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#F0E8DA]">
                          {form.size_chart.map((row, index) => (
                            <tr key={index}>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.size}
                                  onChange={(event) =>
                                    onUpdateSizeRow(
                                      index,
                                      "size",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="S, M, L..."
                                  className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#2453D4]"
                                />
                              </td>

                              {SIZE_MEASURE_COLUMNS.map((column) => (
                                <td key={column.field} className="px-2 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={row[column.field]}
                                    onChange={(event) =>
                                      onUpdateSizeRow(
                                        index,
                                        column.field,
                                        event.target.value,
                                      )
                                    }
                                    className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#2453D4]"
                                  />
                                </td>
                              ))}

                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => onRemoveSizeRow(index)}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                  aria-label="ลบแถวไซส์"
                                >
                                  <IonIcon icon={removeCircleOutline} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[#A39988]">
                      ยังไม่มีแถวไซส์ — เลือกตาราง standard ด้านบน หรือกด
                      "เพิ่มแถว" เพื่อสร้างตารางเอง
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={onAddSizeRow}
                    className="mt-3 rounded-lg border border-dashed border-[#DCCFB8] px-3 py-2 text-sm text-[#2453D4] hover:bg-[#F8F4EA]"
                  >
                    + เพิ่มแถว (สร้างตารางเอง)
                  </button>
                </div>
              )}
            </div>

            {/* Images & Colors summary */}
            <button
              type="button"
              onClick={onOpenImages}
              className="flex w-full items-center justify-between rounded-xl border border-[#E9DFC9] bg-[#FCFAF6] p-4 text-left hover:border-[#2453D4]"
            >
              <div className="flex items-center gap-3">
                <IonIcon icon={pricetagOutline} className="text-xl text-[#2453D4]" />

                <div>
                  <p className="text-sm font-medium text-[#332F29]">
                    รูปสินค้า &amp; สี
                  </p>

                  <p className="mt-1 text-xs text-[#8B806E]">
                    {colorsSummary} · {imagesSummary} รูป — กดเพื่อจัดการสีและอัปโหลดรูป
                    4 มุม
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-[#2453D4] px-3 py-2 text-xs text-white">
                จัดการ
              </span>
            </button>

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
