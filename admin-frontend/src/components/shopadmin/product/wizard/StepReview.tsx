import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";
import { CATEGORY_OPTIONS } from "./constants";

interface StepReviewProps {
  ctl: ProductFormController;
}

// ป้ายชื่อหมวดหมู่
const categoryLabel = (value: string) =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;

const genderLabel = (value: string) =>
  value === "MALE" ? "ชาย" : value === "FEMALE" ? "หญิง" : "ทุกเพศ";

function ReviewSection({
  title,
  step,
  ctl,
  children,
}: {
  title: string;
  step: number;
  ctl: ProductFormController;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#332F29]">{title}</h3>

        <button
          type="button"
          onClick={() => ctl.goToStep(step)}
          className="rounded-lg px-3 py-1.5 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
        >
          แก้ไข
        </button>
      </div>

      {children}
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-32 shrink-0 text-[#8B806E]">{label}</span>

      <span className="min-w-0 flex-1 break-words text-[#332F29]">
        {value || <span className="text-[#C9BFAE]">—</span>}
      </span>
    </div>
  );
}

export default function StepReview({ ctl }: StepReviewProps) {
  const { form, selectedChart } = ctl;

  const selectedChartEntry = selectedChart?.entries.find(
    (entry) => entry.category === form.category,
  );

  return (
    <div className="space-y-4">
      {/* Step 1 — รายละเอียด */}
      <ReviewSection title="รายละเอียดสินค้า" step={0} ctl={ctl}>
        <ReviewRow label="ชื่อสินค้า" value={form.name} />
        <ReviewRow label="SKU" value={form.sku} />
        <ReviewRow label="หมวดหมู่" value={categoryLabel(form.category)} />
        <ReviewRow label="เพศสินค้า" value={genderLabel(form.gender)} />
        <ReviewRow label="เนื้อผ้า" value={form.fabric} />
        <ReviewRow label="ฤดู" value={form.seasons.join(", ")} />
        <ReviewRow label="โอกาสในการใช้งาน" value={form.occasions.join(", ")} />
        <ReviewRow
          label="ราคา"
          value={form.price ? `฿${Number(form.price).toLocaleString()}` : ""}
        />
        <ReviewRow label="รายละเอียด" value={form.description} />
        <ReviewRow
          label="สถานะ"
          value={form.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        />
      </ReviewSection>

      {/* Step 2 — ตารางไซส์ */}
      <ReviewSection title="ตารางไซส์" step={1} ctl={ctl}>
        {selectedChart ? (
          <>
            <ReviewRow label="ตารางของร้าน" value={selectedChart.name} />

            <ReviewRow
              label="ไซส์ (หมวดนี้)"
              value={
                selectedChartEntry && selectedChartEntry.rows.length > 0
                  ? selectedChartEntry.rows
                      .map((row) => row.size)
                      .filter(Boolean)
                      .join(", ")
                  : ""
              }
            />
          </>
        ) : form.size_chart.some((row) => row.size.trim()) ? (
          <ReviewRow
            label="ตารางเฉพาะตัว"
            value={form.size_chart
              .map((row) => row.size)
              .filter((size) => size.trim())
              .join(", ")}
          />
        ) : (
          <ReviewRow label="ตารางไซส์" value="ไม่มี (Accessories)" />
        )}
      </ReviewSection>

      {/* Step 3 — สี & รูป */}
      <ReviewSection title="สี & รูปสินค้า" step={2} ctl={ctl}>
        {form.colors.length === 0 ? (
          <ReviewRow label="สี" value="" />
        ) : (
          <ul className="space-y-3">
            {form.colors.map((color, index) => {
              const frontCount =
                color.new_images.filter((image) => image.view === "FRONT")
                  .length +
                color.existing_images.filter(
                  (image) =>
                    image.view === "FRONT" &&
                    !color.removed_image_ids.includes(image.id),
                ).length;

              const totalCount =
                color.new_images.length +
                color.existing_images.length -
                color.removed_image_ids.length;

              return (
                <li
                  key={color.id ?? `new-${index}`}
                  className="flex items-center gap-3 rounded-xl bg-[#FCFAF6] p-3"
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-[#EFE7D8]"
                    style={{ backgroundColor: color.hex || "#EFE7D8" }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#332F29]">
                      {color.legacy
                        ? "ไม่ระบุสี (รูปเดิม)"
                        : color.name || "สีใหม่"}
                    </p>

                    <p className="mt-0.5 text-xs text-[#8B806E]">
                      รูปทั้งหมด {totalCount} รูป
                      {frontCount === 0 ? (
                        <span className="text-red-500"> · ขาดรูปด้านหน้า</span>
                      ) : (
                        ` · ด้านหน้า ${frontCount} รูป`
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ReviewSection>

      <p className="text-xs text-[#A39988]">
        ตรวจสอบข้อมูลถูกต้องแล้ว กดปุ่ม "บันทึกสินค้า" ด้านล่าง
      </p>
    </div>
  );
}
