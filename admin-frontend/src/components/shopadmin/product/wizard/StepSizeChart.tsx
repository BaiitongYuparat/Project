import { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  addOutline,
  gridOutline,
  refreshOutline,
} from "ionicons/icons";

import type { ProductFormController } from "../../../../pages/AdminStore/useProductForm";
import { chartMatchesCategory } from "../../../../services/ShopAdmin/sizeChartService";
import {
  CHART_CATEGORIES,
  GENDER_OPTIONS,
  SIZE_MEASURE_COLUMNS,
  requiresSizeChart,
} from "./constants";
import type {
  BrandSizeChart,
  BrandSizeChartEntryRow,
  ProductGender,
  SizeChartForm,
  SizeChartRowForm,
  SizeChartTemplate,
} from "../../../../types/product";

interface StepSizeChartProps {
  ctl: ProductFormController;
}

// โหมดการใช้ตารางไซส์ — "shop" = ตารางกลางของร้าน, "custom" = เฉพาะตัวสินค้านี้
type ChartMode = "shop" | "custom";

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

const CATEGORY_LABELS: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  set: "Set (ชุด — รวมท่อนบน+ท่อนล่าง)",
};

const GENDER_SHORT: Record<ProductGender, string> = {
  UNISEX: "ทุกเพศ",
  MALE: "ชาย",
  FEMALE: "หญิง",
};

// ค่าที่จะโชว์ใน dropdown เมื่อแถวฟอร์มมาจากตาราง standard
const TEMPLATE_OPTION_PREFIX = "tpl:";

const templateOptionValue = (templateId: string) =>
  `${TEMPLATE_OPTION_PREFIX}${templateId}`;

// แถวของตารางกลาง → แถวฟอร์ม (แถวว่างของ freesize → ตั้งชื่อไซส์ FREESIZE ให้)
const entryRowsToFormRows = (
  rows: BrandSizeChartEntryRow[],
): SizeChartRowForm[] => {
  const mapped = rows.map((row) => ({
    size: row.size,
    chest: row.chest === null ? "" : String(row.chest),
    waist: row.waist === null ? "" : String(row.waist),
    hips: row.hips === null ? "" : String(row.hips),
    length: row.length === null ? "" : String(row.length),
  }));

  if (mapped.length === 0 || mapped.every((row) => !row.size.trim())) {
    return mapped.length > 0
      ? [{ ...mapped[0], size: "FREESIZE" }]
      : [{ ...EMPTY_ROW, size: "FREESIZE" }];
  }

  return mapped;
};

// ดึงแถวของหมวดที่ต้องการจากตาราง (set อาจดึงจากตารางแยก top / bottom)
const entryRowsFromChart = (
  chart: BrandSizeChart,
  category: string,
): SizeChartRowForm[] => {
  const entry = chart.entries.find((item) => item.category === category);

  return entry ? entryRowsToFormRows(entry.rows) : [{ ...EMPTY_ROW, size: "FREESIZE" }];
};

export default function StepSizeChart({ ctl }: StepSizeChartProps) {
  // โหมดการใช้ตารางไซส์ — "shop" = ตารางกลางของร้าน, "custom" = เฉพาะตัวสินค้านี้
  // init จาก size_chart_id ตอน mount และตั้งใหม่ตรงจุดที่ข้อมูลเปลี่ยน
  // (เลือกตาราง/สร้างตารางใหม่ → shop, เลือก standard/override → custom)
  const [mode, setMode] = useState<ChartMode>(() =>
    ctl.form.size_chart_id ? "shop" : "custom",
  );

  // ---------- inline creator (ฟอร์มสร้างตารางกลาง) ----------
  const [chartForm, setChartForm] = useState<SizeChartForm>(() =>
    emptyChartForm(ctl.form.gender),
  );
  const [creatingChart, setCreatingChart] = useState(false);
  const [chartError, setChartError] = useState("");

  // ตารางแยก top / bottom ที่เลือกไว้ (โหมด "ใช้ตารางของร้าน" สำหรับสินค้า set)
  const [splitTopId, setSplitTopId] = useState("");
  const [splitBottomId, setSplitBottomId] = useState("");

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
          : [
              ...previous.entries,
              {
                category,
                rows: [
                  // Free Size เปิดอยู่ → แถวแรกตั้งชื่อไซส์ FREESIZE ให้ (แก้ได้ / เว้นว่างได้)
                  previous.is_freesize
                    ? { ...EMPTY_ROW, size: "FREESIZE" }
                    : { ...EMPTY_ROW },
                ],
              },
            ],
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
      const nextEntries = [...previous.entries];

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

    // สำเร็จ → หุบ panel + reset + กลับโหมด "ใช้ตารางของร้าน"
    // (createChartInline ตั้ง size_chart_id ให้แล้ว)
    setMode("shop");
    setChartForm(emptyChartForm(ctl.form.gender));
    ctl.setShowChartCreator(false);
  };

  // ปุ่ม "สร้างตาราง" disable จนกว่าฟอร์มครบ + hint ว่าขาดอะไร
  // Free Size = ชื่อไซส์ใส่หรือเว้นว่างก็ได้ → ไม่บังคับ (ตรงกับ validation ฝั่ง server)
  const creatorHint = !chartForm.name.trim()
    ? "ใส่ชื่อตารางก่อน"
    : chartForm.entries.length === 0
      ? "เลือกหมวดที่ตารางครอบคลุมก่อน"
      : !chartForm.is_freesize &&
          chartForm.entries.some((entry) =>
            entry.rows.every((row) => !row.size.trim()),
          )
        ? "แต่ละหมวดต้องมีชื่อไซส์อย่างน้อย 1 แถว"
        : null;

  // ---------- render helpers ----------

  // ตารางกรอกได้ (ใช้ใน creator + โหมดเฉพาะตัว)
  const renderRowsEditor = (
    rows: SizeChartRowForm[],
    onUpdate: (
      rowIndex: number,
      field: keyof SizeChartRowForm,
      value: string,
    ) => void,
    onAdd: (() => void) | null,
    onRemove: ((rowIndex: number) => void) | null,
    freesize: boolean,
  ) => (
    <div>
      {rows.length > 0 && (
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
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(event) =>
                        onUpdate(rowIndex, "size", event.target.value)
                      }
                      placeholder={freesize ? "FREESIZE" : "S, M, L..."}
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

  // ตารางอ่านอย่างเดียว (preview ตารางกลางของร้าน)
  const renderPreviewTable = (rows: BrandSizeChartEntryRow[]) => {
    if (rows.length === 0) {
      return (
        <p className="text-xs text-[#8B806E]">
          ตารางนี้ยังไม่มีแถวไซส์ (Free Size อาจไม่ระบุตัววัด)
        </p>
      );
    }

    return (
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-xs text-[#786E5D]">
          <tr>
            <th className="px-2 py-2 font-medium">ไซส์</th>

            {SIZE_MEASURE_COLUMNS.map((column) => (
              <th key={column.field} className="px-2 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-[#F0E8DA]">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-2 py-2 font-medium text-[#332F29]">
                {row.size}
              </td>

              {SIZE_MEASURE_COLUMNS.map((column) => (
                <td key={column.field} className="px-2 py-2 text-[#5B5347]">
                  {row[column.field] === null ? "—" : `${row[column.field]}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ---------- โหมด accessories: ไม่ต้องตั้งค่าตารางไซส์ ----------
  if (!requiresSizeChart(ctl.form.category)) {
    return (
      <div className="rounded-2xl border border-[#E9DFC9] bg-[#FCFAF6] p-6 text-center">
        <p className="text-sm font-medium text-[#332F29]">
          สินค้าประเภท accessories ไม่ต้องตั้งค่าตารางไซส์
        </p>

        <p className="mt-1 text-sm text-[#8B806E]">
          กดปุ่ม "ถัดไป" ด้านล่างไปขั้นตอนถัดไปได้เลย
        </p>
      </div>
    );
  }

  // ---------- derived: กรองตารางตามหมวดสินค้า (ขั้นรายละเอียด) ----------

  const isSetProduct = ctl.form.category === "set";

  // ตารางของร้านที่ตรงกับหมวดสินค้าเท่านั้น (กติกาเดียวกับ validation ตอนกดถัดไป)
  // set = ตารางต้องมีทั้ง top + bottom ครบ
  const matchingCharts = ctl.sortedCharts.filter((chart) =>
    chartMatchesCategory(chart, ctl.form.category),
  );

  // standard templates ที่ตรงหมวด (set → แม่แบบ top หรือ bottom ใช้เป็นครึ่งตารางได้)
  const matchingTemplates = ctl.templates.filter(
    (template) =>
      !template.category ||
      template.category === ctl.form.category ||
      (ctl.form.category === "set" &&
        (template.category === "top" || template.category === "bottom")),
  );

  // ---------- ตารางแยก top / bottom (สินค้า set) ----------

  const splitTopCharts = isSetProduct
    ? ctl.sortedCharts.filter((chart) => chartMatchesCategory(chart, "top"))
    : [];
  const splitBottomCharts = isSetProduct
    ? ctl.sortedCharts.filter((chart) => chartMatchesCategory(chart, "bottom"))
    : [];

  const splitTopChart =
    ctl.charts.find((chart) => chart.id === splitTopId) ?? null;
  const splitBottomChart =
    ctl.charts.find((chart) => chart.id === splitBottomId) ?? null;

  const splitReady = Boolean(splitTopChart && splitBottomChart);

  // รวมตารางแยก top + bottom → ฟอร์มสร้างตารางกลางใหม่ (prefill ครบ แก้ก่อนยืนยันได้)
  // กดแล้วจะได้ตารางกลางของร้านที่มีทั้ง top + bottom ครบ และสินค้าถูกผูกไปที่ตารางนั้น
  const handleCombineToChart = () => {
    if (!splitReady || !splitTopChart || !splitBottomChart) return;

    setChartForm({
      name: `ตารางชุด — ${splitTopChart.name} + ${splitBottomChart.name}`,
      gender: ctl.form.gender,
      is_freesize: false,
      entries: [
        {
          category: "top",
          rows: entryRowsFromChart(splitTopChart, "top"),
        },
        {
          category: "bottom",
          rows: entryRowsFromChart(splitBottomChart, "bottom"),
        },
      ],
    });
    setChartError("");
    ctl.setShowChartCreator(true);
  };

  // ตาราง standard ที่ใช้เป็นแม่แบบอยู่ (สำหรับ dropdown + banner โหมดเฉพาะตัว)
  const activeTemplate =
    ctl.activeTemplateId && !ctl.form.size_chart_id
      ? ctl.templates.find((item) => item.id === ctl.activeTemplateId) ?? null
      : null;

  // ค่า dropdown: ตารางกลางที่เลือก หรือ standard ที่ใช้เป็นแม่แบบ
  const dropdownValue = ctl.form.size_chart_id
    ? ctl.form.size_chart_id
    : activeTemplate
      ? templateOptionValue(activeTemplate.id)
      : "";

  const handleDropdownChange = (value: string) => {
    setChartError("");

    if (value.startsWith(TEMPLATE_OPTION_PREFIX)) {
      const template = ctl.templates.find(
        (item) => item.id === value.slice(TEMPLATE_OPTION_PREFIX.length),
      );

      if (template) {
        ctl.handleApplyTemplate(template);
        setMode("custom");
      }

      return;
    }

    setMode(value ? "shop" : "custom");
    ctl.handleSizeChartChange(value || null);
  };

  // คลิกการ์ดโหมด — ต้องเปลี่ยนข้อมูลจริงด้วยเพื่อให้ UI กับข้อมูลตรงกันเสมอ:
  // - กด "เฉพาะตัว" ทั้งที่มีตารางกลางเลือกอยู่ → ถอดตารางกลางออก
  // - กด "ใช้ตารางของร้าน" แต่ยังไม่ได้เลือกตาราง → auto เลือกตารางที่ตรงหมวดที่สุด (ถ้ามี)
  const handleModeClick = (nextMode: ChartMode) => {
    if (nextMode === mode) return;

    if (nextMode === "custom") {
      if (ctl.form.size_chart_id) {
        ctl.handleSizeChartChange(null);
      }

      setMode("custom");
      return;
    }

    const best = matchingCharts[0] ?? null;

    if (!ctl.form.size_chart_id && best) {
      ctl.handleSizeChartChange(best.id);
    }

    setMode("shop");
  };

  return (
    <div className="space-y-5">
      {/* ① การ์ดเลือกโหมด */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleModeClick("shop")}
          aria-pressed={mode === "shop"}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            mode === "shop"
              ? "border-[#87947A] bg-[#F4F4EF]"
              : "border-[#E9DFC9] bg-white opacity-70 hover:opacity-100"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              mode === "shop" ? "text-[#332F29]" : "text-[#786E5D]"
            }`}
          >
            ใช้ตารางของร้าน
            {mode === "shop" && (
              <span className="ml-2 rounded-full bg-[#87947A] px-2 py-0.5 text-[10px] font-semibold text-white">
                เลือกอยู่
              </span>
            )}
          </p>

          <p className="mt-1 text-xs text-[#8B806E]">
            แก้ที่เดียว สินค้าทุกตัวที่ใช้ตารางนี้เปลี่ยนตาม (แนะนำ)
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleModeClick("custom")}
          aria-pressed={mode === "custom"}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            mode === "custom"
              ? "border-[#87947A] bg-[#F4F4EF]"
              : "border-[#E9DFC9] bg-white opacity-70 hover:opacity-100"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              mode === "custom" ? "text-[#332F29]" : "text-[#786E5D]"
            }`}
          >
            ใส่ตารางเฉพาะตัวสินค้านี้
            {mode === "custom" && (
              <span className="ml-2 rounded-full bg-[#87947A] px-2 py-0.5 text-[10px] font-semibold text-white">
                เลือกอยู่
              </span>
            )}
          </p>

          <p className="mt-1 text-xs text-[#8B806E]">
            แก้ได้เฉพาะสินค้าตัวนี้ สินค้าอื่นไม่กระทบ
          </p>
        </button>
      </div>

      {/* ② เนื้อหาโหมดที่เลือก — แสดงบล็อกเดียว */}
      {mode === "shop" ? (
        <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
          <p className="text-sm font-medium text-[#332F29]">
            เลือกตารางไซส์
          </p>

          {ctl.sortedCharts.length === 0 ? (
            <p className="mt-2 rounded-xl bg-[#FCFAF6] p-3 text-xs text-[#8B806E]">
              ร้านยังไม่มีตารางไซส์ของตัวเอง — เลือกจาก "ตาราง standard
              ของแพลตฟอร์ม" ด้านล่างได้เลย หรือกดปุ่ม "สร้างตารางใหม่" ก่อนก็ได้
            </p>
          ) : matchingCharts.length === 0 ? (
            <p className="mt-2 rounded-xl bg-[#FCFAF6] p-3 text-xs text-[#8B806E]">
              ไม่มีตารางของร้านที่ตรงกับหมวด "{ctl.form.category}" —
              กด "สร้างตารางใหม่" หรือสลับไปใส่ตารางเฉพาะตัว
              {isSetProduct &&
                " (หรือประกอบตารางจากตารางแยก top + bottom ด้านล่าง)"}
            </p>
          ) : null}

          <select
            value={dropdownValue}
            onChange={(event) => handleDropdownChange(event.target.value)}
            className="mt-3 w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
          >
            <option value="">— เลือกตารางไซส์ —</option>

            {matchingCharts.length > 0 && (
              <optgroup label="ตารางของร้าน">
                {matchingCharts.map((chart) => (
                  <option key={chart.id} value={chart.id}>
                    {chart.name} ({GENDER_SHORT[chart.gender]}
                    {chart.entries.length > 0 &&
                      ` · ${chart.entries
                        .map(
                          (entry) =>
                            CATEGORY_LABELS[entry.category] ?? entry.category,
                        )
                        .join(", ")})`}
                  </option>
                ))}
              </optgroup>
            )}

            {matchingTemplates.length > 0 && (
              <optgroup label="ตาราง standard ของแพลตฟอร์ม (คัดลอกมาแก้ได้)">
                {matchingTemplates.map((template) => (
                  <option key={template.id} value={templateOptionValue(template.id)}>
                    {template.name} ({GENDER_SHORT[template.gender]}
                    {template.category ? ` · ${template.category}` : " · ทุกหมวด"})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <p className="mt-2 text-xs text-[#A39988]">
            เลือกตาราง standard = คัดลอกแถวมาเป็นตารางเฉพาะตัวสินค้านี้ แก้ได้ทันที
            (สินค้าไม่ผูกกับ standard โดยตรง)
          </p>

          {/* สินค้า set — ประกอบตารางจากตารางแยก top + bottom */}
          {isSetProduct && (
            <div className="mt-4 rounded-xl border border-dashed border-[#DCCFB8] p-4">
              <p className="text-sm font-medium text-[#332F29]">
                หรือประกอบตารางชุดจากตารางแยก
              </p>

              <p className="mt-1 text-xs text-[#8B806E]">
                ร้านมีตาราง top กับ bottom แยกกัน? เลือกทั้งคู่แล้วรวมเป็นตารางเดียวได้
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#786E5D]">
                    ตารางท่อนบน (top)
                  </span>

                  <select
                    value={splitTopId}
                    onChange={(event) => setSplitTopId(event.target.value)}
                    className="w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#87947A]"
                  >
                    <option value="">
                      — เลือกตาราง top ({splitTopCharts.length}) —
                    </option>

                    {splitTopCharts.map((chart) => (
                      <option key={chart.id} value={chart.id}>
                        {chart.name} ({GENDER_SHORT[chart.gender]})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#786E5D]">
                    ตารางท่อนล่าง (bottom)
                  </span>

                  <select
                    value={splitBottomId}
                    onChange={(event) => setSplitBottomId(event.target.value)}
                    className="w-full rounded-lg border border-[#E9DFC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#87947A]"
                  >
                    <option value="">
                      — เลือกตาราง bottom ({splitBottomCharts.length}) —
                    </option>

                    {splitBottomCharts.map((chart) => (
                      <option key={chart.id} value={chart.id}>
                        {chart.name} ({GENDER_SHORT[chart.gender]})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleCombineToChart}
                  disabled={!splitReady}
                  className="rounded-lg bg-[#3B2C25] px-4 py-2 text-xs font-medium text-white hover:bg-[#2A201B] disabled:opacity-40"
                >
                  สร้างตารางชุดจากทั้งสองตาราง
                </button>
              </div>

              <p className="mt-2 text-xs text-[#A39988]">
                ตารางชุดที่สร้างจะเป็นตารางกลางใหม่ของร้าน (มีทั้ง top + bottom
                ครบ) และสินค้านี้จะถูกผูกไปที่ตารางนั้นทันที
              </p>
            </div>
          )}

          {/* Preview ตารางกลางที่เลือก (อ่านอย่างเดียว) */}
          {ctl.selectedChart && ctl.selectedEntry && (
            <div className="mt-4 rounded-xl bg-[#FCFAF6] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium capitalize text-[#332F29]">
                  <IonIcon icon={gridOutline} />
                  ตารางของหมวด "
                  {CATEGORY_LABELS[ctl.selectedEntry.category] ??
                    ctl.selectedEntry.category}
                  "
                </p>

                <span className="rounded-full bg-[#EFE9DC] px-2.5 py-1 text-[10px] font-medium text-[#8B806E]">
                  อ่านอย่างเดียว — แก้ได้ที่หน้า ตารางไซส์ของร้าน
                </span>
              </div>

              {renderPreviewTable(ctl.selectedEntry.rows)}

              <button
                type="button"
                onClick={() => {
                  ctl.handleOverrideFromChart(ctl.form.size_chart_id ?? "");
                  setMode("custom");
                }}
                className="mt-3 rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
              >
                คัดลอกตารางนี้มาแก้เฉพาะตัว (override)
              </button>

              <p className="mt-1.5 text-xs text-[#A39988]">
                จะกลายเป็นตารางของสินค้านี้เท่านั้น ตารางกลางไม่ถูกแก้
              </p>
            </div>
          )}

          {ctl.selectedChart && !ctl.selectedEntry && (
            <p className="mt-3 rounded-xl bg-[#FCFAF6] p-4 text-xs text-[#8B806E]">
              ตารางนี้ไม่มีข้อมูลสำหรับหมวด "{ctl.form.category}" — เลือกตารางอื่น
              หรือสลับไปใส่ตารางเฉพาะตัว
            </p>
          )}

          {/* สร้างตารางกลางใหม่ */}
          {ctl.showChartCreator ? (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[#DCCFB8] p-5">
              <p className="text-sm font-medium text-[#332F29]">
                สร้างตารางไซส์ใหม่ให้ร้าน
              </p>

              {chartError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {chartError}
                </div>
              )}

              {/* ① ชื่อตาราง */}
              <div className="mt-4">
                <p className="text-sm font-medium text-[#332F29]">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#87947A] text-[10px] font-semibold text-white">
                    1
                  </span>
                  ชื่อตาราง <span className="text-red-500">*</span>
                </p>

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
                  className="mt-2 w-full rounded-lg border border-[#E9DFC9] px-3 py-2.5 text-sm outline-none focus:border-[#87947A]"
                />
              </div>

              {/* ② เพศ + Free Size */}
              <div className="mt-4">
                <p className="text-sm font-medium text-[#332F29]">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#87947A] text-[10px] font-semibold text-white">
                    2
                  </span>
                  เพศ
                </p>

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

                <label className="mt-3 flex w-fit cursor-pointer items-center gap-2.5 rounded-xl bg-[#FCFAF6] px-3.5 py-2.5 text-sm text-[#332F29]">
                  <input
                    type="checkbox"
                    checked={chartForm.is_freesize}
                    onChange={handleToggleFreesize}
                    className="h-4 w-4 accent-[#87947A]"
                  />
                  <span className="font-medium">Free Size (ไซส์เดียว)</span>
                  <span className="text-xs text-[#8B806E]">
                    แต่ละหมวดเหลือแถวเดียว — ชื่อไซส์ใส่หรือเว้นว่างก็ได้
                    (ตัววัดยังกรอกได้)
                  </span>
                </label>
              </div>

              {/* ③ หมวดที่ตารางครอบคลุม */}
              <div className="mt-4">
                <p className="text-sm font-medium text-[#332F29]">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#87947A] text-[10px] font-semibold text-white">
                    3
                  </span>
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

              {/* ④ ตารางต่อหมวด */}
              {chartForm.entries.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-[#332F29]">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#87947A] text-[10px] font-semibold text-white">
                      4
                    </span>
                    กรอกตัววัดของแต่ละหมวด
                  </p>

                  {chartForm.entries.map((entry) => (
                    <div
                      key={entry.category}
                      className="mt-3 rounded-xl bg-[#FCFAF6] p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-medium capitalize text-[#332F29]">
                          <IonIcon icon={gridOutline} />
                          ตารางไซส์ — {entry.category}
                        </p>

                        <button
                          type="button"
                          onClick={() => applyStandardTemplate(entry.category)}
                          className="rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
                        >
                          เริ่มจากตาราง standard
                        </button>
                      </div>

                      {renderRowsEditor(
                        entry.rows,
                        (rowIndex, field, value) =>
                          updateRow(entry.category, rowIndex, field, value),
                        // Free Size = ไซส์เดียว → ไม่ให้เพิ่มแถวเพิ่ม
                        chartForm.is_freesize
                          ? null
                          : () => addRow(entry.category),
                        (rowIndex) => removeRow(entry.category, rowIndex),
                        chartForm.is_freesize,
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setChartForm(emptyChartForm(ctl.form.gender));
                    setChartError("");
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-[#8B806E] hover:bg-[#F8F4EA]"
                >
                  ล้างและเริ่มใหม่
                </button>

                <button
                  type="button"
                  onClick={() => ctl.setShowChartCreator(false)}
                  className="rounded-lg px-4 py-2 text-sm text-[#8B806E] hover:bg-[#F8F4EA]"
                >
                  ปิด
                </button>

                <button
                  type="button"
                  onClick={submitChart}
                  disabled={creatingChart || creatorHint !== null}
                  className="rounded-lg bg-[#3B2C25] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A201B] disabled:opacity-60"
                >
                  {creatingChart ? "กำลังสร้าง..." : "สร้างตาราง"}
                </button>
              </div>

              {creatorHint && (
                <p className="mt-2 text-right text-xs text-[#A39988]">
                  {creatorHint}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setChartForm(emptyChartForm(ctl.form.gender));
                setChartError("");
                ctl.setShowChartCreator(true);
              }}
              className="mt-4 flex items-center gap-1 rounded-lg border border-[#87947A] px-3 py-2 text-xs text-[#6B7A5E] hover:bg-[#F8F4EA]"
            >
              <IonIcon icon={addOutline} />
              สร้างตารางใหม่
            </button>
          )}
        </div>
      ) : (
        /* โหมดเฉพาะตัว — ตารางของสินค้านี้ */
        <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5">
          <p className="text-sm font-medium text-[#332F29]">
            ตารางไซส์เฉพาะตัวสินค้านี้
          </p>

          {/* แถบแจ้งว่าแถวมาจากตาราง standard */}
          {activeTemplate && (
            <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#F4F4EF] px-3.5 py-2.5 text-xs text-[#5B5347]">
              <IonIcon icon={refreshOutline} className="shrink-0" />
              แม่แบบจากตาราง standard: {activeTemplate.name} — แก้ได้เลย
              สินค้าอื่นไม่กระทบ (ถ้าอยากใช้แบบกลาง กลับไปเลือก "ใช้ตารางของร้าน")
            </p>
          )}

          {ctl.templates.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-[#786E5D]">
                เริ่มจากตาราง standard
              </label>

              <select
                value={dropdownValue}
                onChange={(event) => handleDropdownChange(event.target.value)}
                className="mt-1.5 w-full max-w-md rounded-lg border border-[#E9DFC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#87947A]"
              >
                <option value="">— เลือกแม่แบบ (ถ้าต้องการ) —</option>

                {matchingTemplates.map((template) => (
                  <option key={template.id} value={templateOptionValue(template.id)}>
                    {template.name} ({GENDER_SHORT[template.gender]}
                    {template.category ? ` · ${template.category}` : " · ทุกหมวด"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {ctl.form.size_chart.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              {renderRowsEditor(
                ctl.form.size_chart,
                ctl.handleUpdateSizeRow,
                ctl.handleAddSizeRow,
                ctl.handleRemoveSizeRow,
                false,
              )}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-[#8B806E]">
                ยังไม่มีแถวไซส์ — เลือก "เริ่มจากตาราง standard" หรือเพิ่มแถวเอง
              </p>

              <div className="mt-3">
                {renderRowsEditor(
                  ctl.form.size_chart,
                  ctl.handleUpdateSizeRow,
                  ctl.handleAddSizeRow,
                  ctl.handleRemoveSizeRow,
                  false,
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
