import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";

import {
  createProduct,
  getProductById,
  getProductOptions,
  getSizeChartTemplates,
  updateProduct,
} from "../../services/ShopAdmin/productService";
import {
  createBrandSizeChart,
  getBrandSizeCharts,
  sortChartsForProduct,
} from "../../services/ShopAdmin/sizeChartService";
import {
  requiresSizeChart,
} from "../../components/shopadmin/product/wizard/constants";
import type {
  BrandSizeChart,
  BrandSizeChartEntryRow,
  Product,
  ProductColorForm,
  ProductFormData,
  ProductFormDraft,
  ProductGender,
  ProductOptions,
  SizeChartForm,
  SizeChartRowForm,
  SizeChartTemplate,
} from "../../types/product";

// ---------- ค่าคงที่ / helpers ----------

export const WIZARD_STEPS = [
  { title: "รายละเอียดสินค้า", description: "ชื่อ หมวดหมู่ เพศ เนื้อผ้า ฤดู โอกาส ราคา" },
  { title: "ตารางไซส์", description: "เลือกตารางของร้าน หรือสร้างใหม่" },
  { title: "รูปสินค้า & สี", description: "เพิ่มสีและอัปโหลดรูป 4 มุม" },
  { title: "ตรวจสอบ & บันทึก", description: "ตรวจข้อมูลก่อนบันทึก" },
];

// key ของแต่ละ step ใช้กับ query param ?step= (deep-link เข้า step ตรง ๆ)
const WIZARD_STEP_KEYS = ["details", "size", "images", "review"] as const;

export const resolveWizardStep = (value: string | null): number | null => {
  if (!value) return null;

  const byKey = WIZARD_STEP_KEYS.indexOf(value as (typeof WIZARD_STEP_KEYS)[number]);
  if (byKey >= 0) return byKey;

  const numeric = Number.parseInt(value, 10);

  return Number.isInteger(numeric) && numeric >= 0 && numeric < WIZARD_STEPS.length
    ? numeric
    : null;
};

const EMPTY_SIZE_ROW: SizeChartRowForm = {
  size: "",
  chest: "",
  waist: "",
  hips: "",
  length: "",
};

const initialForm: ProductFormData = {
  name: "",
  category: "",
  gender: "UNISEX",
  fabric: "",
  seasons: [],
  occasions: [],
  price: "",
  description: "",
  sku: "",
  is_active: true,
  size_chart_id: null,
  size_chart: [],
  colors: [],
};

// key ของ draft ใน sessionStorage แยกตามร้าน (สินค้าที่กำลังแก้แยก key ต่างหาก)
export const draftKey = (slug: string, productId?: string | null) =>
  productId
    ? `product_form_draft_${slug}_${productId}`
    : `product_form_draft_${slug}`;

// มี draft ค้างอยู่ไหม (ใช้กับ indicator บน tab bar)
export const hasPendingDraft = (slug: string) =>
  Object.keys(sessionStorage).some((key) =>
    key.startsWith(`product_form_draft_${slug}`),
  );

// เตรียม draft ก่อนเซฟ — ตัด new_images (File) ทิ้ง เพราะเก็บใน JSON ไม่ได้
const buildDraft = (
  form: ProductFormData,
  remove_color_ids: string[],
  editing_product_id: string | null,
  step: number,
): ProductFormDraft => ({
  form: {
    ...form,
    colors: form.colors.map((color) => ({
      id: color.id,
      name: color.name,
      hex: color.hex,
      existing_images: color.existing_images,
      removed_image_ids: color.removed_image_ids,
      ...(color.legacy ? { legacy: true } : {}),
    })) as ProductColorForm[],
  },
  remove_color_ids,
  editing_product_id,
  step,
});

// เตรียม draft หลังกู้ — เติม field ที่ถูกตัดไปกลับเป็นค่าว่าง
const restoreFormFromDraft = (raw: ProductFormDraft): ProductFormData => ({
  ...initialForm,
  ...raw.form,
  colors: (raw.form.colors ?? []).map((color) => ({
    ...color,
    new_images: color.new_images ?? [],
    removed_image_ids: color.removed_image_ids ?? [],
  })),
});

// เลือก template ที่ตรงกับเพศ/หมวดหมู่มากที่สุด
const pickDefaultTemplate = (
  templates: SizeChartTemplate[],
  gender: ProductGender,
  category: string,
) => {
  const exact = templates.find(
    (template) => template.gender === gender && template.category === category,
  );

  if (exact) return exact;

  const byCategory = templates.find(
    (template) =>
      template.gender === "UNISEX" && template.category === category,
  );

  return byCategory ?? templates[0] ?? null;
};

const templateToRows = (template: SizeChartTemplate): SizeChartRowForm[] =>
  template.rows.map((row) => ({
    size: row.size,
    chest: row.chest === null ? "" : String(row.chest),
    waist: row.waist === null ? "" : String(row.waist),
    hips: row.hips === null ? "" : String(row.hips),
    length: row.length === null ? "" : String(row.length),
  }));

// แปลงแถวของตารางกลางเป็นแถวของฟอร์ม (ใช้ตอน override)
const chartRowsToFormRows = (
  rows: BrandSizeChartEntryRow[],
): SizeChartRowForm[] =>
  rows.map((row) => ({
    size: row.size,
    chest: row.chest === null ? "" : String(row.chest),
    waist: row.waist === null ? "" : String(row.waist),
    hips: row.hips === null ? "" : String(row.hips),
    length: row.length === null ? "" : String(row.length),
  }));

// เลือกตารางกลางที่ดีที่สุด (เรียงตรงเพศ/หมวดขึ้นก่อน)
const pickBestChart = (
  charts: BrandSizeChart[],
  gender: ProductGender,
  category: string,
): BrandSizeChart | null => {
  const sorted = sortChartsForProduct(charts, gender, category);

  if (!category) return sorted[0] ?? null;

  return (
    sorted.find((chart) =>
      chart.entries.some(
        (entry) => entry.category === category && entry.rows.length > 0,
      ),
    ) ?? null
  );
};

// สินค้าจาก DB → ฟอร์ม (โหมดแก้ไข)
const productToForm = (product: Product): ProductFormData => {
  const colors: ProductColorForm[] = product.colors.map((color) => ({
    id: color.id,
    name: color.name,
    hex: color.hex ?? "",
    existing_images: color.images,
    new_images: [],
    removed_image_ids: [],
  }));

  const legacyImages = product.images.filter(
    (image) => image.color_id === null,
  );

  if (legacyImages.length > 0) {
    colors.push({
      id: null,
      name: "ไม่ระบุสี (รูปเดิม)",
      hex: "",
      existing_images: legacyImages,
      new_images: [],
      removed_image_ids: [],
      legacy: true,
    });
  }

  return {
    name: product.name,
    category: product.category,
    gender: product.gender ?? "UNISEX",
    fabric: product.fabric ?? "",
    seasons: product.seasons ?? [],
    occasions: product.occasions ?? [],
    price: product.price === null ? "" : String(product.price),
    description: product.description ?? "",
    sku: product.sku ?? "",
    is_active: product.is_active,
    size_chart_id: product.size_chart_id ?? null,
    size_chart: product.size_charts.map((row) => ({
      size: row.size,
      chest:
        row.chest === null || row.chest === undefined ? "" : String(row.chest),
      waist:
        row.waist === null || row.waist === undefined ? "" : String(row.waist),
      hips:
        row.hips === null || row.hips === undefined ? "" : String(row.hips),
      length:
        row.length === null || row.length === undefined
          ? ""
          : String(row.length),
    })),
    colors,
  };
};

// ---------- hook หลัก ----------

export function useProductForm(
  slug: string | undefined,
  productId: string | null,
) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // flag ข้ามการเซฟ draft 1 ครั้ง — ใช้หลังบันทึกสินค้าสำเร็จ เพื่อกัน effect
  // เซฟ draft (ที่รันใหม่ตอน saving เปลี่ยนเป็น false) เขียนข้อมูลเก่าทับกลับลง sessionStorage
  const skipNextDraftSave = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<ProductFormData>({ ...initialForm });
  const [removeColorIds, setRemoveColorIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Platform config (template ไซส์ + ตัวเลือกฤดู/โอกาส)
  const [templates, setTemplates] = useState<SizeChartTemplate[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [fetchedOptions, setFetchedOptions] = useState<ProductOptions>({
    seasons: [],
    occasions: [],
  });

  // ตารางไซส์กลางของร้าน
  const [charts, setCharts] = useState<BrandSizeChart[]>([]);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // wizard
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);

  // ตารางไซส์ถูกแก้เองแล้วหรือยัง (ยังไม่แก้ = อนุญาตให้ re-pick อัตโนมัติ)
  const sizeChartTouched = useRef(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // inline สร้างตาราง (step 2)
  const [showChartCreator, setShowChartCreator] = useState(false);

  // อ่าน draft จาก sessionStorage ตอน mount (ไม่ลบใน initializer กัน StrictMode อ่านซ้ำไม่เจอ)
  const [draft, setDraft] = useState<ProductFormDraft | null>(() => {
    if (!slug) return null;

    try {
      const raw = sessionStorage.getItem(draftKey(slug, productId));

      return raw ? (JSON.parse(raw) as ProductFormDraft) : null;
    } catch (err) {
      console.error("Read draft error:", err);
      return null;
    }
  });

  const clearDraft = useCallback(() => {
    if (slug) {
      sessionStorage.removeItem(draftKey(slug, productId));
    }

    setDraft(null);
  }, [slug, productId]);

  // โหลด config ของแพลตฟอร์ม
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [templateList, optionList] = await Promise.all([
          getSizeChartTemplates(),
          getProductOptions(),
        ]);

        if (cancelled) return;

        setTemplates(templateList);
        setFetchedOptions(optionList);
      } catch (err) {
        console.error("Load product config error:", err);
      } finally {
        if (!cancelled) setConfigLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // โหลดตารางไซส์กลางของร้าน
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    (async () => {
      try {
        const chartList = await getBrandSizeCharts(slug);

        if (!cancelled) {
          setCharts(chartList);
          setChartsLoaded(true);
        }
      } catch (err) {
        console.error("Load size charts error:", err);

        if (!cancelled) setChartsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // โหลดสินค้าที่กำลังแก้ (โหมด edit)
  const [productLoaded, setProductLoaded] = useState(!productId);

  useEffect(() => {
    if (!productId || !slug) return;

    let cancelled = false;

    (async () => {
      try {
        const product = await getProductById(slug, productId);

        if (cancelled) return;

        setEditingProduct(product);
        setProductLoaded(true);
      } catch (err) {
        console.error("Load product error:", err);

        if (!cancelled) {
          // สินค้าไม่มีจริง → กลับหน้า list
          navigate(`/shopadmin/${slug}/products`, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, slug, navigate]);

  const dataReady =
    chartsLoaded && configLoaded && (productId ? productLoaded : true);

  // เริ่มต้นฟอร์ม: กู้ draft (ถ้ามี) หรือ map จากสินค้า (edit) / prefill ตาราง (create)
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!dataReady || initializedRef.current) return;

    let cancelled = false;

    (async () => {
      // defer ให้ setState ทั้งหมดอยู่นอก synchronous phase ของ effect
      await Promise.resolve();

      if (cancelled) return;

      initializedRef.current = true;

      const stored = draft;

      setDraft(null);

      if (stored) {
        // กู้ draft
        const restoredForm = restoreFormFromDraft(stored);

        if (restoredForm.size_chart_id) {
          const chartExists = charts.some(
            (chart) => chart.id === restoredForm.size_chart_id,
          );

          if (!chartExists) {
            restoredForm.size_chart_id = null;
            setError("ตารางไซส์ที่เคยเลือกถูกลบแล้ว โปรดเลือกตารางใหม่");
          }
        }

        setForm(restoredForm);
        setRemoveColorIds(stored.remove_color_ids ?? []);
        setActiveTemplateId(null);
        sizeChartTouched.current = true;

        const restoredStep = Math.min(
          stored.step ?? 0,
          WIZARD_STEPS.length - 1,
        );

        setStep(restoredStep);
        setFurthestStep(restoredStep);
      } else if (productId && editingProduct) {
        // แก้ไขสินค้า — map ข้อมูลเดิม (ไม่ re-prefill ทับ)
        setForm(productToForm(editingProduct));
        setRemoveColorIds([]);
        sizeChartTouched.current = true;
      } else {
        // สร้างใหม่ — pre-select ตารางกลาง (ถ้ามี) หรือ prefill ตาราง standard
        setRemoveColorIds([]);
        sizeChartTouched.current = false;

        const base = { ...initialForm };
        const best = pickBestChart(charts, base.gender, base.category);

        setForm(
          best
            ? { ...base, size_chart_id: best.id }
            : (() => {
                const template = pickDefaultTemplate(
                  templates,
                  base.gender,
                  base.category,
                );

                return template
                  ? { ...base, size_chart: templateToRows(template) }
                  : base;
              })(),
        );
      }

      // deep-link ?step=images — เปิดตรง step ที่ระบุ (เช่น กดปุ่มแก้ไขจากแผงตรวจรูป)
      // ข้อมูลฟอร์ม (draft/ข้อมูลเดิม) ยังกู้ตามปกติ แค่ step ถูก override
      const paramStep = resolveWizardStep(searchParams.get("step"));

      if (paramStep !== null) {
        setStep(paramStep);
        setFurthestStep((previous) => Math.max(previous, paramStep));
        // เคลียร์ param ทันที ไม่ให้ refresh หน้าแล้วกลับมา step เดิมซ้ำ
        setSearchParams({}, { replace: true });
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [dataReady, draft, charts, editingProduct, productId, templates]);

  // เซฟ draft อัตโนมัติขณะ wizard เปิดอยู่ — กัน refresh/สลับ tab กลางทาง
  useEffect(() => {
    if (!slug || !dataReady || loading || saving) return;

    // เพิ่งบันทึกสำเร็จและเคลียร์ draft ไปแล้ว — ห้ามเขียนข้อมูลเก่าทับกลับ
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }

    try {
      sessionStorage.setItem(
        draftKey(slug, productId),
        JSON.stringify(
          buildDraft(form, removeColorIds, productId ?? null, step),
        ),
      );
    } catch (err) {
      console.error("Save draft error:", err);
    }
  }, [slug, dataReady, loading, saving, form, removeColorIds, productId, step]);

  // ---------- derived (ตารางไซส์) ----------

  const sortedCharts = useMemo(
    () => sortChartsForProduct(charts, form.gender, form.category),
    [charts, form.gender, form.category],
  );

  const selectedChart = useMemo(
    () =>
      form.size_chart_id
        ? charts.find((chart) => chart.id === form.size_chart_id) ?? null
        : null,
    [charts, form.size_chart_id],
  );

  const selectedEntry = useMemo(
    () =>
      selectedChart?.entries.find(
        (entry) => entry.category === form.category,
      ) ?? null,
    [selectedChart, form.category],
  );

  // ---------- handlers (ฟอร์ม) ----------

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    const nextValue =
      event.target instanceof HTMLInputElement &&
      event.target.type === "checkbox"
        ? event.target.checked
        : value;

    setForm((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  // ตัวช่วย: เมื่อเพศ/หมวดเปลี่ยนและยังไม่ได้แก้เอง — re-pick ตารางกลาง หรือ prefill standard
  const rePickOrPrefill = useCallback(
    (next: ProductFormData): ProductFormData => {
      if (sizeChartTouched.current) return next;

      if (next.size_chart_id) {
        const best = pickBestChart(charts, next.gender, next.category);

        return best ? { ...next, size_chart_id: best.id } : next;
      }

      const template = pickDefaultTemplate(
        templates,
        next.gender,
        next.category,
      );

      return template ? { ...next, size_chart: templateToRows(template) } : next;
    },
    [charts, templates],
  );

  const handleGenderChange = (gender: ProductGender) => {
    setForm((previous) => rePickOrPrefill({ ...previous, gender }));
  };

  const handleToggleArrayField = (field: "seasons" | "occasions", value: string) => {
    setForm((previous) => {
      const list = previous[field];
      const nextList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

      return { ...previous, [field]: nextList };
    });
  };

  const handleCategoryChange = (value: string) => {
    setForm((previous) => rePickOrPrefill({ ...previous, category: value }));
  };

  // ---------- handlers (ตารางไซส์โหมดแก้เอง) ----------

  const handleUpdateSizeRow = (
    index: number,
    field: keyof SizeChartRowForm,
    value: string,
  ) => {
    sizeChartTouched.current = true;

    setForm((previous) => ({
      ...previous,
      size_chart: previous.size_chart.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const handleAddSizeRow = () => {
    sizeChartTouched.current = true;

    setForm((previous) => ({
      ...previous,
      size_chart: [...previous.size_chart, { ...EMPTY_SIZE_ROW }],
    }));
  };

  const handleRemoveSizeRow = (index: number) => {
    sizeChartTouched.current = true;

    setForm((previous) => ({
      ...previous,
      size_chart: previous.size_chart.filter(
        (_, rowIndex) => rowIndex !== index,
      ),
    }));
  };

  const handleApplyTemplate = (template: SizeChartTemplate) => {
    sizeChartTouched.current = true;
    setActiveTemplateId(template.id);

    setForm((previous) => ({
      ...previous,
      size_chart_id: null,
      size_chart: templateToRows(template),
    }));
  };

  const handleSizeChartChange = (chartId: string | null) => {
    setForm((previous) => {
      const next = { ...previous, size_chart_id: chartId };

      // สลับกลับมาโหมดแก้เองโดยยังไม่มี rows → prefill จาก standard
      if (
        !chartId &&
        !sizeChartTouched.current &&
        next.size_chart.length === 0
      ) {
        const template = pickDefaultTemplate(
          templates,
          next.gender,
          next.category,
        );

        return template
          ? { ...next, size_chart: templateToRows(template) }
          : next;
      }

      return next;
    });
  };

  const handleOverrideFromChart = (chartId: string) => {
    const chart = charts.find((item) => item.id === chartId);

    if (!chart) return;

    const entry = chart.entries.find(
      (item) => item.category === form.category,
    );

    if (!entry || entry.rows.length === 0) return;

    sizeChartTouched.current = true;
    setActiveTemplateId(null);

    setForm((previous) => ({
      ...previous,
      size_chart_id: null,
      size_chart: chartRowsToFormRows(entry.rows),
    }));
  };

  // ---------- inline สร้างตารางกลาง (step 2) ----------

  const createChartInline = useCallback(
    async (
      chartForm: SizeChartForm,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!slug) return { ok: false, error: "ไม่พบร้านค้า" };

      if (!chartForm.name.trim()) {
        return { ok: false, error: "กรุณาตั้งชื่อตารางไซส์" };
      }

      if (chartForm.entries.length === 0) {
        return { ok: false, error: "เลือกอย่างน้อย 1 หมวดหมู่" };
      }

      for (const entry of chartForm.entries) {
        if (!entry.rows.some((row) => row.size.trim())) {
          return {
            ok: false,
            error: `หมวด "${entry.category}" ต้องมีไซส์อย่างน้อย 1 แถว`,
          };
        }
      }

      try {
        const response = await createBrandSizeChart(slug, chartForm);
        const chart = response.data?.chart as BrandSizeChart | undefined;

        if (!chart) {
          return { ok: false, error: "ไม่สามารถสร้างตารางไซส์ได้" };
        }

        setCharts((previous) => [{ ...chart, product_count: 0 }, ...previous]);
        sizeChartTouched.current = true;
        setError("");
        setForm((previous) => ({ ...previous, size_chart_id: chart.id }));

        return { ok: true };
      } catch (err) {
        console.error("Create size chart error:", err);

        return {
          ok: false,
          error: isAxiosError(err)
            ? err.response?.data?.message ?? "ไม่สามารถสร้างตารางไซส์ได้"
            : "ไม่สามารถสร้างตารางไซส์ได้",
        };
      }
    },
    [slug],
  );

  // ---------- handlers (สี & รูป) ----------

  const handleAddColor = () => {
    setForm((previous) => ({
      ...previous,
      colors: [
        // กลุ่มรูปเดิม (legacy) ไว้ล่าสุดเสมอ
        ...previous.colors.filter((color) => !color.legacy),
        {
          id: null,
          name: "",
          hex: "",
          existing_images: [],
          new_images: [],
          removed_image_ids: [],
        },
        ...previous.colors.filter((color) => color.legacy),
      ],
    }));
  };

  const handleUpdateColor = (
    index: number,
    patch: Partial<ProductColorForm>,
  ) => {
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((color, colorIndex) =>
        colorIndex === index ? { ...color, ...patch } : color,
      ),
    }));
  };

  // ลบสีทั้งกลุ่ม — สีเดิมใน DB จะถูกส่งไป remove_color_ids ตอนบันทึก
  const handleRemoveColor = (index: number) => {
    setForm((previous) => {
      const color = previous.colors[index];

      if (color?.id) {
        setRemoveColorIds((ids) => [...new Set([...ids, color.id!])]);
      }

      return {
        ...previous,
        colors: previous.colors.filter((_, colorIndex) => colorIndex !== index),
      };
    });
  };

  const handleColorImageChange = (
    colorIndex: number,
    view: ProductColorForm["new_images"][number]["view"],
    file: File | undefined,
  ) => {
    if (!file) return;

    setError("");

    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        const oldImage = color.existing_images.find(
          (image) => image.view === view,
        );

        const removedImageIds = oldImage
          ? [...new Set([...color.removed_image_ids, oldImage.id])]
          : color.removed_image_ids;

        return {
          ...color,
          removed_image_ids: removedImageIds,
          new_images: [
            ...color.new_images.filter((image) => image.view !== view),
            { file, view },
          ],
        };
      }),
    }));
  };

  const handleRemoveExistingImage = (
    colorIndex: number,
    imageId: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              removed_image_ids: [
                ...new Set([...color.removed_image_ids, imageId]),
              ],
            }
          : color,
      ),
    }));
  };

  const handleRemoveNewImage = (colorIndex: number, imageIndex: number) => {
    setForm((previous) => ({
      ...previous,
      colors: previous.colors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              new_images: color.new_images.filter(
                (_, imageIdx) => imageIdx !== imageIndex,
              ),
            }
          : color,
      ),
    }));
  };

  // ---------- wizard navigation + validation ----------

  const validateStep = useCallback(
    (target: number): string | null => {
      if (target === 0) {
        if (!form.name.trim()) return "กรุณากรอกชื่อสินค้า";
        if (!form.category) return "กรุณาเลือกหมวดหมู่";
        return null;
      }

      if (target === 1) {
        if (requiresSizeChart(form.category)) {
          if (form.size_chart_id) {
            const chart = charts.find(
              (item) => item.id === form.size_chart_id,
            );

            if (!chart) {
              return "ตารางไซส์ที่เลือกไม่ถูกต้อง โปรดเลือกใหม่";
            }

            const entry = chart.entries.find(
              (item) => item.category === form.category,
            );

            if (!entry || entry.rows.length === 0) {
              return `ตารางไซส์ที่เลือกไม่มีข้อมูลสำหรับหมวด "${form.category}"`;
            }
          } else {
            const hasRows = form.size_chart.some((row) => row.size.trim());

            if (!hasRows) {
              return "ต้องมีตารางไซส์อย่างน้อย 1 แถวสำหรับหมวดหมู่นี้";
            }
          }
        }

        return null;
      }

      if (target === 2) {
        // ต้องมีอย่างน้อย 1 สี
        const realColors = form.colors.filter(
          (color) => !color.legacy && (color.id || color.name.trim()),
        );

        if (realColors.length === 0) {
          return "ต้องมีสีสินค้าอย่างน้อย 1 สี (เพิ่มสีใน step รูปสินค้า & สี)";
        }

        // ทุกสีต้องมีรูปด้านหน้า
        for (const color of realColors) {
          const hasFront =
            color.new_images.some((image) => image.view === "FRONT") ||
            color.existing_images.some(
              (image) =>
                image.view === "FRONT" &&
                !color.removed_image_ids.includes(image.id),
            );

          if (!hasFront) {
            return `สี "${color.name || "สีใหม่"}" ต้องมีรูปภาพด้านหน้าอย่างน้อย 1 รูป`;
          }
        }

        // สีใหม่ต้องตั้งชื่อ
        const unnamedColor = form.colors.find(
          (color) =>
            !color.legacy &&
            !color.id &&
            !color.name.trim() &&
            color.new_images.length > 0,
        );

        if (unnamedColor) {
          return "กรุณาตั้งชื่อสีให้ครบทุกสีที่เพิ่มรูป";
        }

        return null;
      }

      return null;
    },
    [form, charts],
  );

  const goNext = () => {
    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    const nextStep = Math.min(step + 1, WIZARD_STEPS.length - 1);

    setStep(nextStep);
    setFurthestStep((previous) => Math.max(previous, nextStep));
  };

  const goBack = () => {
    setError("");
    setStep((previous) => Math.max(0, previous - 1));
  };

  const goToStep = (target: number) => {
    if (target === step) return;

    // ไปข้างหน้าผ่าน sidebar → ต้อง validate ทุก step ระหว่างทาง
    if (target > furthestStep) {
      for (let index = step; index < target; index += 1) {
        const validationError = validateStep(index);

        if (validationError) {
          setError(validationError);
          setStep(index);
          setFurthestStep((previous) => Math.max(previous, index));
          return;
        }
      }
    }

    setError("");
    setStep(target);
    setFurthestStep((previous) => Math.max(previous, target));
  };

  // ---------- บันทึก / ยกเลิก ----------

  const submitProduct = async (): Promise<boolean> => {
    if (!slug) return false;

    // ตรวจทุก step ก่อนบันทึก
    for (let index = 0; index < WIZARD_STEPS.length - 1; index += 1) {
      const validationError = validateStep(index);

      if (validationError) {
        setError(validationError);
        setStep(index);
        return false;
      }
    }

    try {
      setSaving(true);
      setError("");

      if (productId) {
        await updateProduct(slug, productId, form, removeColorIds);
      } else {
        await createProduct(slug, form);
      }

      // เคลียร์ draft ก่อน — แล้วกัน effect เซฟ draft (ที่จะรันตอน setSaving(false))
      // เขียนข้อมูลเก่าทับกลับ ไม่งั้นกลับมาหน้าเพิ่มสินค้าจะเจอข้อมูลเดิมทั้งหมด
      skipNextDraftSave.current = true;
      clearDraft();

      return true;
    } catch (err) {
      console.error("Save product error:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message ?? "ไม่สามารถบันทึกสินค้าได้"
          : "ไม่สามารถบันทึกสินค้าได้",
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  // ยกเลิกฟอร์มเอง → ทิ้ง draft กลับหน้า list
  const cancelWizard = () => {
    clearDraft();
    navigate(`/shopadmin/${slug}/products`);
  };

  return {
    // data
    loading,
    saving,
    error,
    setError,
    form,
    charts,
    templates,
    options: fetchedOptions,
    editingProduct,
    productId,
    // wizard
    step,
    furthestStep,
    goNext,
    goBack,
    goToStep,
    validateStep,
    // ตารางไซส์
    sortedCharts,
    selectedChart,
    selectedEntry,
    activeTemplateId,
    showChartCreator,
    setShowChartCreator,
    // handlers
    handleChange,
    handleGenderChange,
    handleCategoryChange,
    handleToggleArrayField,
    handleUpdateSizeRow,
    handleAddSizeRow,
    handleRemoveSizeRow,
    handleApplyTemplate,
    handleSizeChartChange,
    handleOverrideFromChart,
    createChartInline,
    // สี & รูป
    removeColorIds,
    handleAddColor,
    handleUpdateColor,
    handleRemoveColor,
    handleColorImageChange,
    handleRemoveExistingImage,
    handleRemoveNewImage,
    // บันทึก
    submitProduct,
    cancelWizard,
  };
}

export type ProductFormController = ReturnType<typeof useProductForm>;
