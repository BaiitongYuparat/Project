import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { IonIcon } from "@ionic/react";
import {
  addOutline,
  arrowBackOutline,
  checkmarkOutline,
  gridOutline,
  removeCircleOutline,
} from "ionicons/icons";

import Button from "../../components/Button";

import {
  createBrandSizeChart,
  entryRowsToFormRows,
  getBrandSizeChartById,
  updateBrandSizeChart,
} from "../../services/ShopAdmin/sizeChartService";
import {
  getSizeChartTemplates,
} from "../../services/ShopAdmin/productService";
import type {
  ProductGender,
  SizeChartEntryForm,
  SizeChartForm,
  SizeChartRowForm,
  SizeChartTemplate,
} from "../../types/product";

const CATEGORY_OPTIONS = ["top", "bottom", "dress"] as const;

const GENDER_OPTIONS: { value: ProductGender; label: string }[] = [
  { value: "UNISEX", label: "ทุกเพศ (Unisex)" },
  { value: "MALE", label: "ชาย" },
  { value: "FEMALE", label: "หญิง" },
];

const MEASURE_COLUMNS: {
  field: keyof SizeChartRowForm;
  label: string;
}[] = [
  { field: "chest", label: "รอบอก" },
  { field: "waist", label: "รอบเอว" },
  { field: "hips", label: "รอบสะโพก" },
  { field: "length", label: "ความยาว" },
];

const EMPTY_ROW: SizeChartRowForm = {
  size: "",
  chest: "",
  waist: "",
  hips: "",
  length: "",
};

export default function SizeChartForm() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = Boolean(id);

  // มาจากฟอร์มสินค้า (กด "เพิ่มตาราง" ใน modal สินค้า) — กลับเข้าหน้า Products ตรง ๆ
  const fromProducts =
    (location.state as { from?: string } | null)?.from === "products";

  const [form, setForm] = useState<SizeChartForm>({
    name: "",
    gender: "UNISEX",
    entries: [],
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState<SizeChartTemplate[]>([]);

  // โหลดตาราง standard สำหรับปุ่ม preset
  useEffect(() => {
    let cancelled = false;

    getSizeChartTemplates()
      .then((items) => {
        if (!cancelled) setTemplates(items);
      })
      .catch((err) => console.error("Load templates error:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  // โหลดตารางที่กำลังแก้ไข
  useEffect(() => {
    if (!isEdit || !slug || !id) return;

    let cancelled = false;

    (async () => {
      try {
        const chart = await getBrandSizeChartById(slug, id);

        if (cancelled) return;

        setForm({
          name: chart.name,
          gender: chart.gender ?? "UNISEX",
          entries: chart.entries.map((entry) => ({
            category: entry.category,
            rows: entryRowsToFormRows(entry.rows),
          })),
        });
      } catch (err) {
        console.error("Load size chart error:", err);
        setError("ไม่สามารถโหลดตารางไซส์ได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, slug, id]);

  const updateEntry = (
    category: string,
    updater: (entry: SizeChartEntryForm) => SizeChartEntryForm,
  ) => {
    setForm((previous) => ({
      ...previous,
      entries: previous.entries.map((entry) =>
        entry.category === category ? updater(entry) : entry,
      ),
    }));
  };

  const toggleCategory = (category: string) => {
    setForm((previous) => {
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

  const handleUpdateRow = (
    category: string,
    rowIndex: number,
    field: keyof SizeChartRowForm,
    value: string,
  ) => {
    updateEntry(category, (entry) => ({
      ...entry,
      rows: entry.rows.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const handleAddRow = (category: string) => {
    updateEntry(category, (entry) => ({
      ...entry,
      rows: [...entry.rows, { ...EMPTY_ROW }],
    }));
  };

  const handleRemoveRow = (category: string, rowIndex: number) => {
    updateEntry(category, (entry) => ({
      ...entry,
      rows: entry.rows.filter((_, index) => index !== rowIndex),
    }));
  };

  // เริ่มจากตาราง standard — โหลด rows ตาม category + เพศที่เลือก
  const applyStandardTemplate = (category: string) => {
    const candidates = templates.filter(
      (template) =>
        (template.gender === form.gender || template.gender === "UNISEX") &&
        (!template.category || template.category === category),
    );

    const exact = candidates.find(
      (template) =>
        template.gender === form.gender && template.category === category,
    );

    const template = exact ?? candidates[0];

    if (!template) {
      setError("ไม่พบตาราง standard สำหรับหมวดหมู่นี้");
      return;
    }

    setError("");
    updateEntry(category, (entry) => ({
      ...entry,
      rows: template.rows.map((row) => ({
        size: row.size,
        chest: row.chest === null ? "" : String(row.chest),
        waist: row.waist === null ? "" : String(row.waist),
        hips: row.hips === null ? "" : String(row.hips),
        length: row.length === null ? "" : String(row.length),
      })),
    }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "กรุณาตั้งชื่อตารางไซส์";
    if (form.entries.length === 0) return "เลือกอย่างน้อย 1 หมวดหมู่";

    for (const entry of form.entries) {
      const hasSize = entry.rows.some((row) => row.size.trim());

      if (!hasSize) {
        return `หมวด "${entry.category}" ต้องมีไซส์อย่างน้อย 1 แถว`;
      }
    }

    return null;
  };

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!slug) return;

      const validationError = validate();

      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setSaving(true);
        setError("");

        let chartId: string | undefined;

        if (isEdit && id) {
          await updateBrandSizeChart(slug, id, form);
        } else {
          const response = await createBrandSizeChart(slug, form);

          chartId = response.data?.chart?.id;
        }

        // มาจากฟอร์มสินค้า → กลับหน้า Products ตรง ๆ (ส่ง id ตารางใหม่ให้เลือกอัตโนมัติ)
        // ไม่งั้นกลับหน้าก่อนหน้า (หน้า list)
        if (fromProducts && slug) {
          navigate(`/shopadmin/${slug}/products`, {
            state: chartId ? { newChartId: chartId } : undefined,
            replace: true,
          });
        } else {
          navigate(-1);
        }
      } catch (err) {
        console.error("Save size chart error:", err);

        setError(
          isAxiosError(err)
            ? err.response?.data?.message ?? "ไม่สามารถบันทึกตารางไซส์ได้"
            : "ไม่สามารถบันทึกตารางไซส์ได้",
        );
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, id, isEdit, form, navigate, fromProducts],
  );

  // ย้อนกลับ: มาจากฟอร์มสินค้า → กลับหน้า Products ตรง ๆ (draft ยังเก็บอยู่ ฟอร์มสินค้าจะถูกกู้)
  const handleBack = () => {
    if (fromProducts && slug) {
      navigate(`/shopadmin/${slug}/products`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-3 flex items-center gap-2 text-sm text-[#8B806E] transition-colors hover:text-[#332F29]"
          >
            <IonIcon icon={arrowBackOutline} />
            {fromProducts ? "ย้อนกลับไปกรอกฟอร์มสินค้า" : "ย้อนกลับ"}
          </button>

          {fromProducts && (
            <p className="mb-1 text-xs text-[#6B7A5E]">
              ข้อมูลฟอร์มสินค้าที่กรอกไว้ถูกเก็บไว้แล้ว — กลับไปแล้วจะได้ฟอร์มเดิมพร้อมเลือกตารางนี้
            </p>
          )}

          <h1 className="text-2xl font-bold text-[#332F29] sm:text-3xl">
            {isEdit ? "แก้ไขตารางไซส์" : "เพิ่มตารางไซส์"}
          </h1>

          <p className="mt-2 text-base text-[#8B806E]">
            ตั้งชื่อ collection เลือกเพศ แล้วเพิ่มตารางไซส์ในแต่ละหมวดหมู่
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-sm text-[#8B806E]">
            กำลังโหลด...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <label className="block rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm transition-colors focus-within:border-[#87947A]">
              <span className="mb-1 block text-sm font-medium text-[#332F29]">
                ชื่อตาราง <span className="text-red-500">*</span>
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="เช่น collection 1, Summer 2026"
                className="w-full rounded-lg border border-[#E9DFC9] px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[#C4BBA9] focus:border-[#87947A] focus:ring-2 focus:ring-[#87947A]/25"
              />
            </label>

            {/* Gender */}
            <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#332F29]">เพศ</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((option) => {
                  const active = form.gender === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          gender: option.value,
                        }))
                      }
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all ${
                        active
                          ? "bg-[#87947A] font-medium text-white shadow-sm"
                          : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                      }`}
                    >
                      <IonIcon
                        icon={checkmarkOutline}
                        className={`text-xs transition-opacity ${
                          active ? "opacity-100" : "hidden"
                        }`}
                        aria-hidden
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#332F29]">
                หมวดหมู่ที่ตารางนี้ครอบคลุม
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => {
                  const active = form.entries.some(
                    (entry) => entry.category === category,
                  );

                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(category)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm capitalize transition-all ${
                        active
                          ? "bg-[#87947A] font-medium text-white shadow-sm"
                          : "bg-[#FCFAF6] text-[#786E5D] hover:bg-[#F8F4EA]"
                      }`}
                    >
                      <IonIcon
                        icon={checkmarkOutline}
                        className={`text-xs transition-opacity ${
                          active ? "opacity-100" : "hidden"
                        }`}
                        aria-hidden
                      />
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-category editors */}
            {form.entries.map((entry) => (
              <div
                key={entry.category}
                className="rounded-2xl border border-[#E9DFC9] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2.5 text-sm font-medium capitalize text-[#332F29]">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCFAF6] text-[#87947A]"
                      aria-hidden
                    >
                      <IonIcon icon={gridOutline} className="text-base" />
                    </span>
                    ตารางไซส์ — {entry.category}
                  </p>

                  <button
                    type="button"
                    onClick={() => applyStandardTemplate(entry.category)}
                    className="rounded-lg border border-[#E9DFC9] px-3 py-2 text-xs font-medium text-[#6B7A5E] transition-colors hover:border-[#DCCFB8] hover:bg-[#F8F4EA]"
                  >
                    เริ่มจากตาราง standard
                  </button>
                </div>

                {/* Rows */}
                {entry.rows.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-[#F0E8DA]">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="bg-[#FCFAF6] text-[11px] uppercase tracking-wide text-[#786E5D]">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">ไซส์</th>

                          {MEASURE_COLUMNS.map((column) => (
                            <th
                              key={column.field}
                              className="px-3 py-2.5 font-semibold"
                            >
                              {column.label} (ซม.)
                            </th>
                          ))}

                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F0E8DA]">
                        {entry.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="group/row transition-colors hover:bg-[#FCFAF6]"
                          >
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.size}
                                onChange={(event) =>
                                  handleUpdateRow(
                                    entry.category,
                                    rowIndex,
                                    "size",
                                    event.target.value,
                                  )
                                }
                                placeholder="S, M, L..."
                                className="w-20 rounded-lg border border-[#E9DFC9] bg-white px-2 py-1.5 text-sm outline-none transition-colors placeholder:text-[#C4BBA9] focus:border-[#87947A] focus:ring-2 focus:ring-[#87947A]/25"
                              />
                            </td>

                            {MEASURE_COLUMNS.map((column) => (
                              <td key={column.field} className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={row[column.field]}
                                  onChange={(event) =>
                                    handleUpdateRow(
                                      entry.category,
                                      rowIndex,
                                      column.field,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="—"
                                  className="w-20 rounded-lg border border-[#E9DFC9] bg-white px-2 py-1.5 text-sm outline-none transition-colors placeholder:text-[#C4BBA9] focus:border-[#87947A] focus:ring-2 focus:ring-[#87947A]/25"
                                />
                              </td>
                            ))}

                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveRow(entry.category, rowIndex)
                                }
                                className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:text-red-500 md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
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
                )}

                <button
                  type="button"
                  onClick={() => handleAddRow(entry.category)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#DCCFB8] py-2.5 text-sm font-medium text-[#6B7A5E] transition-colors hover:bg-[#F8F4EA]"
                >
                  <IonIcon icon={addOutline} className="text-base" />
                  เพิ่มแถวไซส์
                </button>
              </div>
            ))}

            {/* Footer */}
            <div className="flex justify-end gap-3 pb-4">
              <Button type="button" onClick={handleBack} variant="outline">
                ยกเลิก
              </Button>

              <Button type="submit" disabled={saving} variant="secondary">
                {saving
                  ? "กำลังบันทึก..."
                  : isEdit
                    ? "บันทึกการแก้ไข"
                    : "สร้างตาราง"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
