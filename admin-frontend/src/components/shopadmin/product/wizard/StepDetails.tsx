import Input from "../../../Input";

import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";
import {
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
} from "./constants";
import { optionLabelTh } from "./optionLabels";

interface StepDetailsProps {
  ctl: ProductFormController;
}

export default function StepDetails({ ctl }: StepDetailsProps) {
  const { form, options } = ctl;

  return (
    <div className="space-y-5">
      {/* Product Name */}
      <Input
        label="ชื่อสินค้า"
        name="name"
        value={form.name}
        onChange={ctl.handleChange}
        required
        placeholder="เช่น เสื้อเชิ้ตแขนยาว"
      />

      {/* SKU and Category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="SKU"
          name="sku"
          value={form.sku}
          onChange={ctl.handleChange}
          placeholder="รหัสสินค้า"
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#332F29]">
            หมวดหมู่ <span className="text-red-500">*</span>
          </span>

          <select
            value={form.category}
            onChange={(event) => ctl.handleCategoryChange(event.target.value)}
            required
            className="w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
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
              onClick={() => ctl.handleGenderChange(option.value)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                form.gender === option.value
                  ? "bg-[#87947A] font-medium text-white"
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
        onChange={ctl.handleChange}
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
              onClick={() => ctl.handleToggleArrayField("seasons", season)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                form.seasons.includes(season)
                  ? "bg-[#87947A] font-medium text-white"
                  : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
              }`}
            >
              {optionLabelTh(season)}
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
              onClick={() => ctl.handleToggleArrayField("occasions", occasion)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                form.occasions.includes(occasion)
                  ? "bg-[#87947A] font-medium text-white"
                  : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
              }`}
            >
              {optionLabelTh(occasion)}
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
        onChange={ctl.handleChange}
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
          onChange={ctl.handleChange}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า..."
          className="w-full resize-none rounded-xl border border-[#E9DFC9] px-4 py-3 text-sm outline-none focus:border-[#87947A]"
        />
      </div>

      {/* Active Status */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#FCFAF6] p-4">
        <input
          type="checkbox"
          name="is_active"
          checked={form.is_active}
          onChange={ctl.handleChange}
          className="h-4 w-4 accent-[#87947A]"
        />

        <div className="flex flex-col justify-center items-start">
          <p className="text-sm font-medium text-[#332F29]">
            เปิดใช้งานสินค้า
          </p>

          <p className="mt-1 text-xs text-[#8B806E]">
            สินค้าที่เปิดใช้งานจะแสดงบนหน้าร้าน
          </p>
        </div>
      </label>

      <p className="text-xs text-[#A39988]">
        กด "ถัดไป" เพื่อไปตั้งค่าตารางไซส์
      </p>
    </div>
  );
}
