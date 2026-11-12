import { useState } from "react";
import { IonIcon } from "@ionic/react";
import { addOutline, closeOutline, gridOutline } from "ionicons/icons";

import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";
import {
  CHART_CATEGORIES,
  GENDER_OPTIONS,
  SIZE_MEASURE_COLUMNS,
} from "./constants";
import type {
  ProductGender,
  SizeChartEntryForm,
  SizeChartForm,
  SizeChartRowForm,
  SizeChartTemplate,
} from "../../../../types/product";

interface StepSizeChartProps {
  ctl: ProductFormController;
}

const EMPTY_ROW: SizeChartRowForm = {
  size: "",
  chest: "",
  waist: "",
  hips: "",
  length: "",
};

const emptyChartForm = (gender: ProductGender): SizeChartForm => ({
  name: "",
  gender,
  is_freesize: false,
  entries: [],
});

export default function StepSizeChart({ ctl }: StepSizeChartProps) {
  const [chartForm, setChartForm] = useState<SizeChartForm>(() =>
    emptyChartForm(ctl.form.gender),
  );
  const [creatingChart, setCreatingChart] = useState(false);
  const [chartError, setChartError] = useState("");

  const categoryLabels: Record<string, string> = {
    top: "Top",
    bottom: "Bottom",
    dress: "Dress",
    set: "Set (ชุด — รวมท่อนบน+ท่อนล่าง)",
  };

  // ---------- inline creator handlers ----------

  const toggleCategory = (category: string) => {
    setChartForm((previous) => {
      const has = previous.entries.some(
        (entry) => entry.category === category,
      );

      return {
        ...previous,
        entries: has
          ? previous.entries.filter((entry) => entry.category !== category)
          : [...previous.entries, { category, rows: [{ ...EMPTY_ROW }] }],
      };
    });
  };

  const updateRow = (
    category: string,
    rowIndex: number,
    field: keyof SizeChartRowForm,
    value: string,
  ) => {
    setChartForm((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.category === category
          ? {
              ...entry,
              rows: entry.rows.map((row, index) =>
                index === rowIndex ? { ...row, [field]: value } : row,
              ),
            }
          : entry,
      ),
    }));
  };

  const addRow = (category: string) => {
    setChartForm((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.category === category
          ? { ...entry, rows: [...entry.rows, { ...EMPTY_ROW }] }
          : entry,
      ),
    }));
  };

  const removeRow = (category: string, rowIndex: number) => {
    setChartForm((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.category === category
          ? {
              ...entry,
              rows: entry.rows.filter((_, index) => index !== rowIndex),
            }
          : entry,
      ),
    }));
  };

  // เปิด/ปิดโหมด Free Size (ไซส์เดียว) — ใช้ได้กับทุกหมวด ไม่ใช่เฉพาะ set
  // เปิดแล้วแต่ละหมวดเหลือแถวเดียว size = FREESIZE (ตัววัดยังกรอกได้)
  const handleToggleFreesize = () => {
    setChartForm((previous) => {
      const nextFreesize = !previous.is_freesize;

      return {
        ...previous,
        is_freesize: nextFreesize,
        // เปิดโหมด → ทุกหมวดเหลือแถวเดียว (เก็บตัววัดของแถวแรกไว้)
        entries: nextFreesize
          ? previous.entries.map((entry) => ({
              ...entry,
              rows: [
                {
                  ...(entry.rows[0] ?? { ...EMPTY_ROW }),
                  size: "FREESIZE",
                },
              ],
            }))
          : previous.entries,
      };
    });
  };

  // preset: เปิดหมวด set — ตาราง set ต้องมี entry ครบทั้ง top + bottom
  const handlePresetSet = () => {
    setChartForm((previous) => {
      let nextEntries = [...previous.entries];

      for (const category of ["top", "bottom"]) {
        if (!nextEntries.some((entry) => entry.category === category)) {
          nextEntries.push({
            category,
            rows: [
              previous.is_freesize
                ? { ...EMPTY_ROW, size: "FREESIZE" }
                : { ...EMPTY_ROW },
            ],
          });
        }
      }

      return { ...previous, entries: nextEntries };
    });
  };

  // เริ่มจากตาราง standard (preset จาก templates ของแพลตฟอร์ม)
  const applyStandardTemplate = (category: string) => {
    const candidates = ctl.templates.filter(
      (template: SizeChartTemplate) =>
        (template.gender === chartForm.gender ||
          template.gender === "UNISEX") &&
        (!template.category || template.category === category),
    );

    const exact = candidates.find(
      (template) =>
        template.gender === chartForm.gender && template.category === category,
    );

    const template = exact ?? candidates[0];

    if (!template) {
      setChartError("ไม่พบตาราง standard สำหรับหมวดหมู่นี้");
      return;
    }

    setChartError("");
    setChartForm((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.category === category
          ? {
              ...entry,
              rows: template.rows.map((row) => ({
                size: row.size,
                chest: row.chest === null ? "" : String(row.chest),
                waist: row.waist === null ? "" : String(row.waist),
                hips: row.hips === null ? "" : String(row.hips),
                length: row.length === null ? "" : String(row.length),
              })),
            }
          : entry,
      ),
    }));
  };

  const submitChart = async () => {
    setCreatingChart(true);
    setChartError("");

    const result = await ctl.createChartInline(chartForm);

    setCreatingChart(false);

    if (!result.ok) {
      setChartError(result.error ?? "ไม่สามารถสร้างตารางไซส์ได้");
      return;
    }

    // สำเร็จ → หุบ panel + reset
    setChartForm(emptyChartForm(ctl.form.gender));
    ctl.setShowChartCreator(false);
  };

  // ---------- render helpers ----------

  const renderRowsEditor = (
    entry: SizeChartEntryForm,
    onUpdate: (
      rowIndex: number,
      field: keyof SizeChartRowForm,
      value: string,
    ) => void,
    onAdd: (() => void) | null,
    onRemove: ((rowIndex: number) => void) | null,
    onPreset?: () => void,
  ) => (
    <div>
      {onPreset && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onPreset}
            className="rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
          >
            เริ่มจากตาราง standard
          </button>
        </div>
      )}

      {entry.rows.length > 0 && (
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

                {onRemove && <th className="px-2 py-2" />}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0E8DA]">
              {entry.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={chartForm.is_freesize ? "FREESIZE" : row.size}
                      onChange={(event) =>
                        onUpdate(rowIndex, "size", event.target.value)
                      }
                      disabled={chartForm.is_freesize}
                      placeholder="S, M, L..."
                      className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#87947A] disabled:bg-[#FCFAF6] disabled:text-[#786E5D]"
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
                          onUpdate(rowIndex, column.field, event.target.value)
                        }
                        className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#87947A]"
                      />
                    </td>
                  ))}

                  {onRemove && (
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(rowIndex)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        aria-label="ลบแถวไซส์"
                      >
                        ลบ
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 rounded-lg border border-dashed border-[#DCCFB8] px-3 py-2 text-sm text-[#6B7A5E] hover:bg-[#F8F4EA]"
        >
          + เพิ่มแถวไซส์
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#8B806E]">
        สินค้าอ้างอิงตารางไซส์กลางของร้าน (แก้กลางที่เดียว สินค้าทุกตัวที่ใช้ตารางนี้เปลี่ยนตาม)
        หรือเลือกโหมดแก้เฉพาะตัวนี้ได้
      </p>

      {/* เลือกตารางกลาง */}
      <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-[#332F29]">
            ตารางไซส์ของร้าน
          </p>

          <button
            type="button"
            onClick={() => ctl.setShowChartCreator(!ctl.showChartCreator)}
            className="flex items-center gap-1 rounded-lg border border-[#87947A] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
          >
            <IonIcon icon={ctl.showChartCreator ? closeOutline : addOutline} />
            {ctl.showChartCreator ? "ยกเลิกสร้างตาราง" : "เพิ่มตาราง"}
          </button>
        </div>

        <select
          value={ctl.form.size_chart_id ?? ""}
          onChange={(event) =>
            ctl.handleSizeChartChange(event.target.value || null)
          }
          className="mt-3 w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
        >
          <option value="">— แก้ตารางเฉพาะตัวนี้ (ไม่ใช้ตารางกลาง) —</option>

          {ctl.sortedCharts.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.name} ({chart.gender === "MALE"
                ? "ชาย"
                : chart.gender === "FEMALE"
                  ? "หญิง"
                  : "ทุกเพศ"}
              {chart.entries.length > 0 &&
                ` · ${chart.entries
                  .map((entry) => categoryLabels[entry.category] ?? entry.category)
                  .join(", ")})`}
            </option>
          ))}
        </select>

        {/* Preview ตารางที่เลือก */}
        {ctl.selectedChart && ctl.selectedEntry && (
          <div className="mt-4 rounded-xl bg-[#FCFAF6] p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium capitalize text-[#332F29]">
              <IonIcon icon={gridOutline} />
              ตารางของหมวด "{categoryLabels[ctl.selectedEntry.category] ?? ctl.selectedEntry.category}"
            </p>

            {renderRowsEditor(
              {
                category: ctl.selectedEntry.category,
                rows: ctl.selectedEntry.rows.map((row) => ({
                  size: row.size,
                  chest: row.chest === null ? "" : String(row.chest),
                  waist: row.waist === null ? "" : String(row.waist),
                  hips: row.hips === null ? "" : String(row.hips),
                  length: row.length === null ? "" : String(row.length),
                })),
              },
              () => {},
              null,
              null,
            )}
          </div>
        )}

        {ctl.selectedChart && !ctl.selectedEntry && (
          <p className="mt-3 rounded-xl bg-[#FCFAF6] p-4 text-xs text-[#8B806E]">
            ตารางนี้ไม่มีข้อมูลสำหรับหมวด "{ctl.form.category}" — เลือกตารางอื่น
            หรือแก้ตารางเฉพาะตัว
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            ctl.handleOverrideFromChart(ctl.form.size_chart_id ?? "")
          }
          disabled={
            !ctl.selectedChart || !ctl.selectedEntry || !ctl.form.size_chart_id
          }
          className="mt-3 rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA] disabled:opacity-40"
        >
          คัดลอกตารางนี้มาแก้เฉพาะตัว (override)
        </button>
      </div>

      {/* Inline สร้างตารางกลาง */}
      {ctl.showChartCreator && (
        <div className="rounded-2xl border-2 border-dashed border-[#DCCFB8] bg-white p-5">
          <p className="text-sm font-medium text-[#332F29]">
            เพิ่มตารางไซส์ใหม่ให้ร้าน
          </p>

          {chartError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {chartError}
            </div>
          )}

          {/* ชื่อตาราง */}
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-[#332F29]">
              ชื่อตาราง <span className="text-red-500">*</span>
            </span>

            <input
              type="text"
              value={chartForm.name}
              onChange={(event) =>
                setChartForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder="เช่น collection 1, Summer 2026"
              className="w-full rounded-lg border border-[#E9DFC9] px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
            />
          </label>

          {/* เพศ */}
          <div className="mt-4">
            <p className="text-sm font-medium text-[#332F29]">เพศ</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={chartForm.gender === option.value}
                  onClick={() =>
                    setChartForm((previous) => ({
                      ...previous,
                      gender: option.value,
                    }))
                  }
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    chartForm.gender === option.value
                      ? "bg-[#87947A] font-medium text-white"
                      : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Free Size — ไซส์เดียว (ใช้ได้กับทุกหมวด) */}
            <label className="mt-3 flex w-fit cursor-pointer items-center gap-2.5 rounded-xl bg-[#FCFAF6] px-3.5 py-2.5 text-sm text-[#332F29]">
              <input
                type="checkbox"
                checked={chartForm.is_freesize}
                onChange={handleToggleFreesize}
                className="h-4 w-4 accent-[#87947A]"
              />
              <span className="font-medium">Free Size (ไซส์เดียว)</span>
              <span className="text-xs text-[#8B806E]">
                แต่ละหมวดเหลือแถวเดียว ชื่อ "FREESIZE" — ตัววัดยังกรอกได้
              </span>
            </label>
          </div>

          {/* หมวดหมู่ */}
          <div className="mt-4">
            <p className="text-sm font-medium text-[#332F29]">
              หมวดหมู่ที่ตารางนี้ครอบคลุม
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {CHART_CATEGORIES.map((category) => {
                const active = chartForm.entries.some(
                  (entry) => entry.category === category,
                );

                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
                      active
                        ? "bg-[#87947A] font-medium text-white"
                        : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handlePresetSet}
              className="mt-3 rounded-lg border border-[#DCCFB8] px-3 py-2 text-xs font-medium text-[#6B7A5E] transition-colors hover:bg-[#F8F4EA]"
            >
              + ตาราง set (เปิด top + bottom ครบทั้งคู่)
            </button>
          </div>

          {/* ตารางต่อหมวด */}
          {chartForm.entries.map((entry) => (
            <div
              key={entry.category}
              className="mt-4 rounded-xl bg-[#FCFAF6] p-4"
            >
              <p className="mb-3 flex items-center gap-2 text-sm font-medium capitalize text-[#332F29]">
                <IonIcon icon={gridOutline} />
                ตารางไซส์ — {entry.category}
              </p>

              {renderRowsEditor(
                entry,
                (rowIndex, field, value) =>
                  updateRow(entry.category, rowIndex, field, value),
                () => addRow(entry.category),
                (rowIndex) => removeRow(entry.category, rowIndex),
                () => applyStandardTemplate(entry.category),
              )}
            </div>
          ))}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => ctl.setShowChartCreator(false)}
              className="rounded-lg px-4 py-2 text-sm text-[#8B806E] hover:bg-[#F8F4EA]"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={submitChart}
              disabled={creatingChart}
              className="rounded-lg bg-[#3B2C25] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A201B] disabled:opacity-60"
            >
              {creatingChart ? "กำลังสร้าง..." : "สร้างตาราง"}
            </button>
          </div>
        </div>
      )}

      {/* Override editor (โหมดแก้เฉพาะตัว) */}
      {ctl.form.size_chart_id === null && (
        <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#332F29]">
              ตารางไซส์เฉพาะตัวสินค้านี้
            </p>

            {ctl.templates.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const template = ctl.templates.find(
                    (item) =>
                      (item.gender === ctl.form.gender ||
                        item.gender === "UNISEX") &&
                      (!item.category || item.category === ctl.form.category),
                  );

                  if (template) ctl.handleApplyTemplate(template);
                }}
                className="rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
              >
                เริ่มจากตาราง standard
              </button>
            )}
          </div>

          {ctl.form.size_chart.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
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
                  {ctl.form.size_chart.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.size}
                          onChange={(event) =>
                            ctl.handleUpdateSizeRow(
                              rowIndex,
                              "size",
                              event.target.value,
                            )
                          }
                          placeholder="S, M, L..."
                          className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#87947A]"
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
                              ctl.handleUpdateSizeRow(
                                rowIndex,
                                column.field,
                                event.target.value,
                              )
                            }
                            className="w-20 rounded-lg border border-[#E9DFC9] px-2 py-1.5 text-sm outline-none focus:border-[#87947A]"
                          />
                        </td>
                      ))}

                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => ctl.handleRemoveSizeRow(rowIndex)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          aria-label="ลบแถวไซส์"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8B806E]">
              ยังไม่มีแถวไซส์ — กด "เริ่มจากตาราง standard" หรือเพิ่มแถวเอง
            </p>
          )}

          <button
            type="button"
            onClick={ctl.handleAddSizeRow}
            className="mt-3 rounded-lg border border-dashed border-[#DCCFB8] px-3 py-2 text-sm text-[#6B7A5E] hover:bg-[#F8F4EA]"
          >
            + เพิ่มแถวไซส์
          </button>
        </div>
      )}
    </div>
  );
}
