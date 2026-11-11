import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { addOutline, chevronDownOutline, searchOutline } from "ionicons/icons";

import Button from "../../components/Button";

import ProductTable from "../../components/shopadmin/product/ProductTable";
import ProductFormModal from "../../components/shopadmin/product/ProductFormModal";
import ProductColorImagesModal from "../../components/shopadmin/product/ProductColorImagesModal";
import ProductQualityPanel from "../../components/shopadmin/product/ProductQuantityPanel";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSizeChartTemplates,
  getProductOptions,
} from "../../services/ShopAdmin/productService";
import {
  getBrandSizeCharts,
  sortChartsForProduct,
} from "../../services/ShopAdmin/sizeChartService";
import type {
  BrandSizeChart,
  BrandSizeChartEntryRow,
  Product,
  ProductColorForm,
  ProductFormData,
  ProductFormDraft,
  ProductGender,
  ProductOptions,
  SizeChartRowForm,
  SizeChartTemplate,
} from "../../types/product";

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

// key ของ draft ใน sessionStorage แยกตามร้าน
const draftKey = (slug: string) => `product_form_draft_${slug}`;

// เตรียม draft ก่อนเซฟ — ตัด new_images (File) ทิ้ง เพราะเก็บใน JSON ไม่ได้
const buildDraft = (
  form: ProductFormData,
  remove_color_ids: string[],
  editing_product_id: string | null,
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
});

// เตรียม draft หลังกู้ — เติม field ที่ถูกตัดไปกลับเป็นค่าว่าง
const restoreFormFromDraft = (raw: ProductFormDraft): ProductFormData => {
  const restored: ProductFormData = {
    ...initialForm,
    ...raw.form,
    colors: (raw.form.colors ?? []).map((color) => ({
      ...color,
      new_images: color.new_images ?? [],
      removed_image_ids: color.removed_image_ids ?? [],
    })),
  };

  return restored;
};

type QualityStatus = "PENDING" | "PASSED" | "FAILED";
type StatusFilter = "ALL" | QualityStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "PENDING", label: "รอตรวจรูป" },
  { value: "PASSED", label: "ผ่าน" },
  { value: "FAILED", label: "ไม่ผ่าน" },
];

// หมวดหมู่ที่ต้องมีตารางไซส์
const requiresSizeChart = (category: string) =>
  category !== "" && category !== "accessories";

// สถานะรวมของสินค้า: มีรูปไม่ผ่าน = ไม่ผ่าน, ผ่านครบทุกรูป = ผ่าน, นอกนั้น = รอตรวจ
const getProductStatus = (product: Product): QualityStatus => {
  const statuses = product.images.map((image) => image.quality_status);

  if (statuses.length === 0) return "PENDING";
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.every((status) => status === "PASSED")) return "PASSED";
  return "PENDING";
};

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

export default function ProductManagement() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>({ ...initialForm });
  const [removeColorIds, setRemoveColorIds] = useState<string[]>([]);

  // Platform config (template ไซส์ + ตัวเลือกฤดู/โอกาส)
  const [templates, setTemplates] = useState<SizeChartTemplate[]>([]);
  const [options, setOptions] = useState<ProductOptions>({
    seasons: [],
    occasions: [],
  });

  // ตารางไซส์กลางของร้าน
  const [charts, setCharts] = useState<BrandSizeChart[]>([]);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // draft ที่เซฟไว้ตอนออกไปหน้าสร้างตารางไซส์ (อ่านจาก sessionStorage)

  // ตารางไซส์ถูกแก้เองแล้วหรือยัง (ยังไม่แก้ = อนุญาตให้ re-prefill อัตโนมัติ)
  const sizeChartTouched = useRef(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [error, setError] = useState("");

  // อ่าน draft จาก sessionStorage ตอน mount (ไม่ลบใน initializer กัน StrictMode อ่านซ้ำไม่เจอ)
  const [draft, setDraft] = useState<ProductFormDraft | null>(() => {
    if (!slug) return null;

    try {
      const raw = sessionStorage.getItem(draftKey(slug));

      return raw ? (JSON.parse(raw) as ProductFormDraft) : null;
    } catch (err) {
      console.error("Read draft error:", err);
      return null;
    }
  });

  // เซฟ draft ลง sessionStorage (ใช้ตอนออกไปหน้าสร้างตาราง)
  const saveDraft = useCallback(() => {
    if (!slug) return;

    try {
      sessionStorage.setItem(
        draftKey(slug),
        JSON.stringify(
          buildDraft(form, removeColorIds, editingProduct?.id ?? null),
        ),
      );
    } catch (err) {
      console.error("Save draft error:", err);
    }
  }, [slug, form, removeColorIds, editingProduct]);

  // ลบ draft (ใช้เมื่อยกเลิกฟอร์มเอง หรือบันทึกสำเร็จ)
  const clearDraft = useCallback(() => {
    if (slug) {
      sessionStorage.removeItem(draftKey(slug));
    }

    setDraft(null);
  }, [slug]);

  // เซฟ draft อัตโนมัติขณะ modal เปิดอยู่ — กัน refresh/ออกจากหน้ากลางทาง
  useEffect(() => {
    if (!slug || !showForm || saving) return;

    try {
      sessionStorage.setItem(
        draftKey(slug),
        JSON.stringify(
          buildDraft(form, removeColorIds, editingProduct?.id ?? null),
        ),
      );
    } catch (err) {
      console.error("Save draft error:", err);
    }
  }, [slug, showForm, saving, form, removeColorIds, editingProduct]);

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
        setOptions(optionList);
      } catch (err) {
        console.error("Load product config error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // โหลดรายการสินค้า
  const loadProducts = useCallback(
    async (silent = true) => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setError("");

        setProducts(await getProducts(slug));
      } catch (err) {
        console.error("Load products error:", err);
        setError("ไม่สามารถโหลดรายการสินค้าได้");
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // กู้ draft หลังโหลด charts + products เสร็จ (กู้แล้วค่อยเคลียร์ draft — กู้ไม่สำเร็จรอบหน้ายังกู้ได้)
  useEffect(() => {
    if (!chartsLoaded || loading || !draft) return;

    let cancelled = false;

    (async () => {
      // defer ให้ setState ทั้งหมดอยู่นอก synchronous phase ของ effect
      await Promise.resolve();

      if (cancelled) return;

      const restored = draft;

      // ตรวจว่าตารางที่ draft อ้างอิงยังมีอยู่จริง (ถ้าถูกลบ → ล้างค่าแทนพัง)
      const restoredForm = restoreFormFromDraft(restored);

      if (restoredForm.size_chart_id) {
        const chartExists = charts.some(
          (chart) => chart.id === restoredForm.size_chart_id,
        );

        if (!chartExists) {
          restoredForm.size_chart_id = null;
          setError("ตารางไซส์ที่เคยเลือกถูกลบแล้ว โปรดเลือกตารางใหม่");
        }
      }

      // กลับมาจากหน้าสร้างตาราง → เลือกตารางที่เพิ่งสร้างให้เลย
      const navState = location.state as { newChartId?: string } | null;

      if (navState?.newChartId) {
        restoredForm.size_chart_id = navState.newChartId;
        window.history.replaceState({}, "");
      }

      setForm(restoredForm);
      setRemoveColorIds(restored.remove_color_ids ?? []);
      setActiveTemplateId(null);
      sizeChartTouched.current = true;

      if (restored.editing_product_id) {
        setEditingProduct(
          products.find(
            (product) => product.id === restored.editing_product_id,
          ) ?? null,
        );
      } else {
        setEditingProduct(null);
      }

      setShowForm(true);

      // กู้สำเร็จ → เคลียร์ draft (auto-save จะเซฟใหม่ขณะแก้ฟอร์มต่ออยู่แล้ว)
      setDraft(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [draft, chartsLoaded, loading, charts, products, setDraft, location.state]);

  // รายการ category dropdown
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  // กรองสินค้า: ชื่อ/SKU + หมวดหมู่ + สถานะคุณภาพรูป
  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        (product.sku ?? "").toLowerCase().includes(keyword);

      const matchCategory = !category || product.category === category;

      const matchStatus =
        statusFilter === "ALL" || getProductStatus(product) === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, category, statusFilter]);

  // สินค้าที่เลือก: หาจาก id ในรายการที่แสดงอยู่ จึงอัปเดตตามข้อมูลล่าสุดเสมอ
  const selectedProduct =
    filteredProducts.find((product) => product.id === selectedId) ??
    filteredProducts[0] ??
    null;

  // Prefill ตารางไซส์จากตาราง standard (ใช้เมื่อยังไม่ได้แก้เอง)
  const prefillSizeChart = useCallback(
    (
      currentForm: ProductFormData,
      templateList: SizeChartTemplate[],
    ): ProductFormData => {
      const template = pickDefaultTemplate(
        templateList,
        currentForm.gender,
        currentForm.category,
      );

      if (!template) return currentForm;

      return {
        ...currentForm,
        size_chart: templateToRows(template),
      };
    },
    [],
  );

  // เปิดฟอร์มเพิ่มสินค้า — pre-select ตารางกลาง (ถ้ามี) หรือ prefill ตาราง standard
  const handleAdd = () => {
    setEditingProduct(null);
    setRemoveColorIds([]);
    setActiveTemplateId(null);
    sizeChartTouched.current = false;
    setError("");

    const base = { ...initialForm };
    const best = pickBestChart(charts, base.gender, base.category);

    setForm(
      best
        ? { ...base, size_chart_id: best.id }
        : prefillSizeChart(base, templates),
    );
    setShowForm(true);
  };

  // เปิดฟอร์มแก้ไขสินค้า
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setRemoveColorIds([]);
    setActiveTemplateId(null);
    sizeChartTouched.current = true; // สินค้าเดิม — ไม่ re-prefill ทับข้อมูลเดิม
    setError("");

    // สีจาก DB + กลุ่มรูปเดิมที่ยังไม่มีสี
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

    setForm({
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
        chest: row.chest === null || row.chest === undefined ? "" : String(row.chest),
        waist: row.waist === null || row.waist === undefined ? "" : String(row.waist),
        hips: row.hips === null || row.hips === undefined ? "" : String(row.hips),
        length: row.length === null || row.length === undefined ? "" : String(row.length),
      })),
      colors,
    });

    setShowForm(true);
  };

  // ปิดฟอร์ม — ยกเลิกเอง = ไม่กู้ draft
  const handleCloseForm = () => {
    if (saving) return;

    setShowForm(false);
    setShowImages(false);
    setEditingProduct(null);
    setForm({ ...initialForm });
    setRemoveColorIds([]);
    setError("");
    clearDraft();
  };

  // เปลี่ยนค่าฟอร์มจาก Input / Textarea / Select
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
  const rePickOrPrefill = (next: ProductFormData): ProductFormData => {
    if (sizeChartTouched.current) return next;

    if (next.size_chart_id) {
      const best = pickBestChart(charts, next.gender, next.category);

      return best ? { ...next, size_chart_id: best.id } : next;
    }

    return prefillSizeChart(next, templates);
  };

  // เปลี่ยนเพศสินค้า — ถ้ายังไม่ได้แก้เอง ให้ re-pick ตารางที่ตรงเพศใหม่
  const handleGenderChange = (gender: ProductGender) => {
    setForm((previous) => rePickOrPrefill({ ...previous, gender }));
  };

  // ตัวเลือกฤดู/โอกาส (multi-select)
  const handleToggleArrayField = (
    field: "seasons" | "occasions",
    value: string,
  ) => {
    setForm((previous) => {
      const list = previous[field];
      const nextList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];

      return { ...previous, [field]: nextList };
    });
  };

  // เปลี่ยนหมวดหมู่ — ถ้ายังไม่ได้แก้เอง ให้ re-pick ตารางที่ตรงหมวดใหม่
  const handleCategoryChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = event.target.value;

    setForm((previous) => rePickOrPrefill({ ...previous, category: value }));
  };

  // ---------- ตารางไซส์ ----------

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
      size_chart: previous.size_chart.filter((_, rowIndex) => rowIndex !== index),
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

  // เลือก/เลิกอ้างอิงตารางไซส์กลางของร้าน
  const handleSizeChartChange = (chartId: string | null) => {
    setForm((previous) => {
      const next = { ...previous, size_chart_id: chartId };

      // สลับกลับมาโหมดแก้เองโดยยังไม่มี rows → prefill จาก standard
      if (
        !chartId &&
        !sizeChartTouched.current &&
        next.size_chart.length === 0
      ) {
        return prefillSizeChart(next, templates);
      }

      return next;
    });
  };

  // สลับเป็นตารางเฉพาะตัว โดย copy rows ของหมวดปัจจุบันจากตารางกลาง
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

  // เซฟ draft แล้วไปหน้าสร้างตารางไซส์ใหม่ (ระบุที่มา เพื่อกลับมาที่ฟอร์มสินค้าถูกจุด)
  const handleGoToNewChart = () => {
    if (!slug) return;

    saveDraft();

    navigate(`/shopadmin/${slug}/size-charts/new`, {
      state: { from: "products" },
    });
  };

  // ---------- สี & รูปภาพ (ใน ProductColorImagesModal) ----------

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

  // เลือกรูปใหม่ให้สี (view เดิมมีรูปแล้ว = เปลี่ยนรูป)
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

  // ลบรูปเดิมของสี
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

  // ลบรูปใหม่ที่เลือกไว้
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

  // ---------- บันทึก ----------

  const validateForm = (): string | null => {
    // ตารางไซส์ required ตามหมวดหมู่ (อ้างอิงตารางกลาง หรือแก้เองก็ได้)
    if (requiresSizeChart(form.category)) {
      if (form.size_chart_id) {
        const chart = charts.find((item) => item.id === form.size_chart_id);

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

    // ต้องมีอย่างน้อย 1 สี
    const realColors = form.colors.filter(
      (color) => !color.legacy && (color.id || color.name.trim()),
    );

    if (realColors.length === 0) {
      return "ต้องมีสีสินค้าอย่างน้อย 1 สี (กด \"รูปสินค้า & สี\" เพื่อเพิ่มสี)";
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
      (color) => !color.legacy && !color.id && !color.name.trim() && color.new_images.length > 0,
    );

    if (unnamedColor) {
      return "กรุณาตั้งชื่อสีให้ครบทุกสีที่เพิ่มรูป";
    }

    return null;
  };

  // บันทึกสินค้า
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slug) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingProduct) {
        await updateProduct(slug, editingProduct.id, form, removeColorIds);
      } else {
        await createProduct(slug, form);
      }

      setShowForm(false);
      setShowImages(false);
      setEditingProduct(null);
      setForm({ ...initialForm });
      setRemoveColorIds([]);
      clearDraft();

      await loadProducts(true);
    } catch (err: any) {
      console.error("Save product error:", err);

      setError(err.response?.data?.message ?? "ไม่สามารถบันทึกสินค้าได้");
    } finally {
      setSaving(false);
    }
  };

  // ลบสินค้า
  const handleDelete = async (productId: string) => {
    if (!slug) return;

    const confirmed = window.confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?");

    if (!confirmed) return;

    try {
      setError("");
      await deleteProduct(slug, productId);
      await loadProducts(true);
    } catch (err) {
      console.error("Delete product error:", err);
      setError("ไม่สามารถลบสินค้าได้");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-left text-2xl font-bold text-[#332F29] sm:text-3xl">
            Product Management
          </h1>

          <p className="mt-2 text-base text-[#8B806E]">
            จัดการข้อมูลสินค้าและตรวจสอบคุณภาพรูปสำหรับ Virtual Try-On
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <Button type="button" onClick={handleAdd} variant="secondary">
            <IonIcon icon={addOutline} className="text-sm md:text-md" />
            เพิ่มสินค้า
          </Button>
        </div>
      </div>

      {/* Toolbar: Search + Category + Quality filter */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:mb-6 lg:flex lg:flex-wrap lg:items-center">
        <label className="flex w-full items-center gap-3 rounded-xl border border-[#E9DFC9] bg-white px-4 py-3 text-sm focus-within:border-[#2453D4] lg:max-w-xs">
          <IonIcon icon={searchOutline} className="text-lg text-[#8B806E]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อสินค้า / SKU"
            className="w-full bg-transparent outline-none placeholder:text-[#8B806E]"
          />
        </label>

        <div className="relative w-full rounded-xl border border-[#E9DFC9] bg-white focus-within:border-[#2453D4] lg:w-48">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="กรองตามหมวดหมู่"
            className="w-full appearance-none bg-transparent py-3 pl-4 pr-10 text-sm outline-none"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <IonIcon
            icon={chevronDownOutline}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8B806E]"
          />
        </div>

        {/* Quality filter */}
        <div className="flex w-full overflow-x-auto rounded-xl border border-[#E9DFC9] bg-white p-1 sm:col-span-2 lg:ml-auto lg:w-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors lg:flex-none ${
                statusFilter === filter.value
                  ? "bg-[#2453D4] font-medium text-white"
                  : "text-[#786E5D] hover:text-[#332F29]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && !showForm && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#E9DFC9] bg-white text-sm text-[#8B806E]">
          กำลังโหลดสินค้า...
        </div>
      ) : (
        <div
          className={`grid items-start gap-6 ${
            selectedProduct ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""
          }`}
        >
          {/* Product Table */}
          <div className="min-w-0">
            <ProductTable
              products={filteredProducts}
              selectedProductId={selectedProduct?.id ?? null}
              onSelect={(product) => setSelectedId(product.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Product Quality Panel (ซ่อนเมื่อไม่มีสินค้าที่เลือก) */}
          {selectedProduct && (
            <div className="min-w-0 lg:sticky lg:top-6">
              <ProductQualityPanel
                key={selectedProduct.id}
                product={selectedProduct}
              />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <ProductFormModal
          editingProduct={editingProduct}
          form={form}
          saving={saving}
          options={options}
          templates={templates}
          charts={charts}
          activeTemplateId={activeTemplateId}
          onClose={handleCloseForm}
          onOpenImages={() => setShowImages(true)}
          onSubmit={handleSubmit}
          onChange={handleChange}
          onGenderChange={handleGenderChange}
          onCategoryChange={handleCategoryChange}
          onToggleArrayField={handleToggleArrayField}
          onUpdateSizeRow={handleUpdateSizeRow}
          onAddSizeRow={handleAddSizeRow}
          onRemoveSizeRow={handleRemoveSizeRow}
          onApplyTemplate={handleApplyTemplate}
          onSizeChartChange={handleSizeChartChange}
          onOverrideFromChart={handleOverrideFromChart}
          onGoToNewChart={handleGoToNewChart}
        />
      )}

      {/* Colors & Images Modal */}
      {showForm && showImages && (
        <ProductColorImagesModal
          colors={form.colors}
          onClose={() => setShowImages(false)}
          onAddColor={handleAddColor}
          onUpdateColor={handleUpdateColor}
          onRemoveColor={handleRemoveColor}
          onImageChange={handleColorImageChange}
          onRemoveExistingImage={handleRemoveExistingImage}
          onRemoveNewImage={handleRemoveNewImage}
        />
      )}

      {/* Form Error */}
      {showForm && error && (
        <div className="fixed left-1/2 top-5 z-[60] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
