
import { Request, Response } from "express";
import { createProduct, deleteProduct, getProductById, getProducts, getPublicProduct, getPublicProducts, updateProductWithImages, getAdminProducts, getAdminProductStats, getSizeChartTemplates, getProductOptions } from "../services/productService";
import { resolveSizeChartForProduct } from "../services/sizeChartService";
import { BrandAccessError } from "../services/brandAccessService";
import { processProductImageQuality, recheckProductImage } from "../services/productImageQuality";
import { deleteImage } from "../utils/s3Utils";

// GET /products

export const getPublicProductsController = async (
  req: Request,
  res: Response
) => {
  try {
    const products = await getPublicProducts();

    return res.status(200).json({
      message: "Public products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get public products error:", error);

    return res.status(500).json({
      message: "Failed to fetch public products",
    });
  }
};

// GET /products/:productId
export const getPublicProductByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { productId } = req.params;

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await getPublicProduct(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({product});
  } catch (error) {
    console.error("Get public product error:", error);

    return res.status(500).json({
      message: "Failed to fetch public product",
    });
  }
};

//------ Shop Admin ------//

//ดึงข้อมูลรวมรูป
export const getProductsController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    const products = await getProducts(brandId);

    return res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};
// GET /brands/:slug/products/:id
export const getProductByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (typeof id !== "string") {
    return res.status(400).json({
        message: "Invalid product ID",
    });
    }

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const product = await getProductById(brandId, id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
};

// POST /brands/:slug/products/:productId/images/:imageId/recheck
// ส่งรูปที่ FAILED กลับเข้าคิวตรวจคุณภาพใหม่ (ไว้กรณี AI ตรวจล้มเหลว)
export const recheckProductImageController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const productId = req.params.productId;
    const imageId = req.params.imageId;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    if (typeof productId !== "string" || typeof imageId !== "string") {
      return res.status(400).json({ message: "Invalid product or image ID" });
    }

    const result = await recheckProductImage(brandId, productId, imageId);

    if (!result.ok) {
      switch (result.reason) {
        case "NOT_FOUND":
          return res.status(404).json({ message: "Image not found" });
        case "UNSUPPORTED":
          return res.status(400).json({ message: "Unsupported image type" });
        case "TOO_SOON":
          return res.status(429).json({
            message: "กรุณารอสักครู่ก่อนตรวจซ้ำ",
            retry_after: result.retry_after ?? 0,
          });
        case "NOT_ALLOWED":
        default:
          return res
            .status(409)
            .json({ message: "ตรวจซ้ำได้เฉพาะรูปที่สถานะไม่ผ่าน" });
      }
    }

    // AI ตรวจเป็น background job — หน้าเว็บจะ poll สถานะเอง
    return res.status(202).json({
      message: "ส่งรูปเข้าคิวตรวจสอบใหม่แล้ว",
    });
  } catch (error) {
    console.error("Recheck product image error:", error);
    return res.status(500).json({ message: "Failed to recheck image" });
  }
};

// ---------- Shared parsing/validation helpers ----------

const GENDERS = ["UNISEX", "MALE", "FEMALE"] as const;
type ProductGenderValue = (typeof GENDERS)[number];

const VIEWS = ["FRONT", "BACK", "LEFT", "RIGHT"] as const;
type ViewValue = (typeof VIEWS)[number];

// ชนิดรูปของสินค้าแบบชุด (เช่น set): SET = รูปรวมทั้งชุด (รูปหลัก), TOP/BOTTOM = รูปแยกท่อน
const PIECES = ["SET", "TOP", "BOTTOM"] as const;
type PieceValue = (typeof PIECES)[number];

const parseGender = (raw: unknown): ProductGenderValue | null => {
  if (raw === undefined || raw === null || raw === "") return "UNISEX";

  return GENDERS.includes(raw as ProductGenderValue)
    ? (raw as ProductGenderValue)
    : null;
};

// JSON string -> string[] (undefined = ไม่ได้ส่งมา, null = ส่งมาผิดรูปแบบ)
const parseStringArray = (raw: unknown): string[] | null | undefined => {
  if (raw === undefined) return undefined;

  let parsed: unknown;

  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
    return null;
  }

  return parsed.map((v) => (v as string).trim()).filter(Boolean);
};

interface ParsedColor {
  id?: string;
  name: string;
  hex: string | null;
}

// สี: create = [{name, hex}], update = [{id?, name, hex}]
const parseColors = (raw: unknown): ParsedColor[] | null | undefined => {
  if (raw === undefined) return undefined;

  let parsed: unknown;

  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const colors: ParsedColor[] = [];

  for (const item of parsed) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) {
      return null;
    }

    colors.push({
      ...(typeof item.id === "string" && item.id.trim()
        ? { id: item.id.trim() }
        : {}),
      name: item.name.trim(),
      hex:
        typeof item.hex === "string" && item.hex.trim()
          ? item.hex.trim()
          : null,
    });
  }

  return colors;
};

interface ParsedSizeChartRow {
  size: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  length: number | null;
}

const parseMeasure = (value: unknown): number | null | "invalid" => {
  if (value === undefined || value === null || value === "") return null;

  const num = Number(value);

  if (!Number.isFinite(num) || num < 0) return "invalid";

  return num;
};

// ตารางไซส์: undefined = ไม่ได้ส่งมา, null = ส่งมาผิดรูปแบบ, array = แทนที่ทั้งชุด
const parseSizeChart = (
  raw: unknown
): ParsedSizeChartRow[] | null | undefined => {
  if (raw === undefined || raw === null || raw === "") return undefined;

  let parsed: unknown;

  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const rows: ParsedSizeChartRow[] = [];

  for (const item of parsed) {
    if (!item || typeof item.size !== "string" || !item.size.trim()) {
      return null;
    }

    const chest = parseMeasure(item.chest);
    const waist = parseMeasure(item.waist);
    const hips = parseMeasure(item.hips);
    const length = parseMeasure(item.length);

    if (
      chest === "invalid" ||
      waist === "invalid" ||
      hips === "invalid" ||
      length === "invalid"
    ) {
      return null;
    }

    rows.push({
      size: item.size.trim(),
      chest: chest as number | null,
      waist: waist as number | null,
      hips: hips as number | null,
      length: length as number | null,
    });
  }

  return rows;
};

// views: string หรือ string[] จาก FormData -> ViewValue[]
const parseViews = (raw: unknown): ViewValue[] | null => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (!list.every((view) => VIEWS.includes(view as ViewValue))) return null;

  return list as ViewValue[];
};

// pieces: ชนิดรูปของแต่ละไฟล์ (parallel array กับ files/views) — optional, ไม่ส่ง = ทุกรูปไม่ระบุ
const parsePieces = (
  raw: unknown,
  fileCount: number
): (PieceValue | null)[] | null => {
  if (raw === undefined || raw === null || raw === "") {
    return Array.from({ length: fileCount }, () => null);
  }

  const list = Array.isArray(raw) ? raw : [raw];

  if (list.length !== fileCount) return null;

  // FormData ส่งค่าว่างมาได้ = ไม่ระบุชนิดรูป
  const normalized = list.map((piece) => (piece === "" ? null : piece));

  if (
    !normalized.every(
      (piece) => piece === null || PIECES.includes(piece as PieceValue)
    )
  ) {
    return null;
  }

  return normalized as (PieceValue | null)[];
};

// color_indexes: ตำแหน่งสีของแต่ละไฟล์ (parallel array กับ files/views)
const parseColorIndexes = (
  raw: unknown,
  fileCount: number,
  colorCount: number
): number[] | null => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const indexes = list.map(Number);

  if (
    indexes.length !== fileCount ||
    !indexes.every(
      (index) =>
        Number.isInteger(index) && index >= 0 && index < Math.max(colorCount, 1)
    )
  ) {
    return null;
  }

  return indexes;
};

// หมวดหมู่ที่ต้องมีตารางไซส์ (accessories ไม่จำเป็น)
const requiresSizeChart = (category: string) => category !== "accessories";

// POST /brands/:slug/products
export const createProductController = async (
  req: Request,
  res: Response
) => {
  const files = (req.files ?? []) as (
    Express.Multer.File & { key: string }
  )[];

  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const {
      name,
      category,
      price,
      description,
      sku,
      gender,
      fabric,
      seasons,
      occasions,
      size_chart,
      size_chart_id,
      colors,
      views: rawViews,
      color_indexes,
      pieces,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        message: "Product name and category are required",
      });
    }

    if (
      price !== undefined &&
      price !== null &&
      (!Number.isFinite(Number(price)) || Number(price) < 0)
    ) {
      return res.status(400).json({ message: "Invalid product price" });
    }

    // ตรวจสอบเพศสินค้า
    const parsedGender = parseGender(gender);

    if (!parsedGender) {
      return res.status(400).json({ message: "Invalid product gender" });
    }

    // ตรวจสอบฤดู/โอกาส
    const parsedSeasons = parseStringArray(seasons);

    if (parsedSeasons === null) {
      return res.status(400).json({ message: "Invalid seasons" });
    }

    const parsedOccasions = parseStringArray(occasions);

    if (parsedOccasions === null) {
      return res.status(400).json({ message: "Invalid occasions" });
    }

    // ตรวจสอบตารางไซส์ (top/bottom/dress ต้องมีอย่างน้อย 1 แถว)
    const sizeChartRows = parseSizeChart(size_chart);

    if (sizeChartRows === null) {
      return res.status(400).json({ message: "Invalid size chart" });
    }

    // ตารางไซส์กลางของร้าน (สำคัญกว่า size_chart rows ถ้าส่งมาพร้อมกัน)
    const parsedSizeChartId =
      typeof size_chart_id === "string" && size_chart_id.trim()
        ? size_chart_id.trim()
        : null;

    if (
      requiresSizeChart(category.trim()) &&
      !parsedSizeChartId &&
      (!sizeChartRows || sizeChartRows.length === 0)
    ) {
      return res.status(400).json({
        message: "ต้องมีตารางไซส์อย่างน้อย 1 แถวสำหรับหมวดหมู่นี้",
      });
    }

    if (parsedSizeChartId) {
      const resolved = await resolveSizeChartForProduct(
        brandId,
        parsedSizeChartId,
        category.trim()
      );

      if (resolved.error === "SIZE_CHART_NOT_FOUND") {
        return res.status(400).json({ message: "ไม่พบตารางไซส์ที่เลือก" });
      }

      if (resolved.error === "SIZE_CHART_CATEGORY_MISSING") {
        return res.status(400).json({
          message: "ตารางไซส์ที่เลือกไม่มีข้อมูลสำหรับหมวดหมู่นี้",
        });
      }
    }

    // ตรวจสอบสี (ต้องมีอย่างน้อย 1 สี)
    const parsedColors = parseColors(colors);

    if (parsedColors === null) {
      return res.status(400).json({
        message: "สินค้าต้องมีสีอย่างน้อย 1 สี",
      });
    }

    if (!parsedColors || parsedColors.length === 0) {
      return res.status(400).json({
        message: "สินค้าต้องมีสีอย่างน้อย 1 สี",
      });
    }

    // รับไฟล์รูปภาพจาก Multer
    if (files.length === 0) {
      return res.status(400).json({
        message: "At least one product image is required",
      });
    }

    const views = parseViews(rawViews);

    if (!views || views.length !== files.length) {
      return res.status(400).json({
        message: "IMAGE_VIEW_COUNT_MISMATCH",
      });
    }

    // pieces: ชนิดรูป (optional — ใช้กับสินค้าแบบชุด เช่น set)
    let parsedPieces = parsePieces(pieces, files.length);

    if (!parsedPieces) {
      return res.status(400).json({
        message: "IMAGE_PIECE_COUNT_MISMATCH",
      });
    }

    // set = สินค้า 1 ชุด → ต้องมีรูปรวมทั้งชุด (SET) อย่างน้อย 1 รูป
    // ถ้าไม่ระบุ pieces มาเลย ถือว่ารูปแรกเป็นรูปชุด
    if (category.trim() === "set") {
      if (!parsedPieces.some((piece) => piece === "SET")) {
        if (parsedPieces.every((piece) => piece === null)) {
          parsedPieces = parsedPieces.map((piece, index) =>
            index === 0 ? "SET" : piece
          );
        } else {
          return res.status(400).json({
            message: "สินค้าชุด (set) ต้องมีรูปรวมทั้งชุดอย่างน้อย 1 รูป",
          });
        }
      }
    }

    const colorIndexes = parseColorIndexes(
      color_indexes,
      files.length,
      parsedColors.length
    );

    if (!colorIndexes) {
      return res.status(400).json({
        message: "Invalid color_indexes",
      });
    }

    // ทุกสีต้องมีรูปด้านหน้าอย่างน้อย 1 รูป (ใช้สำหรับ Virtual Try-On)
    for (const [colorIndex, color] of parsedColors.entries()) {
      const hasFront = files.some(
        (_, index) =>
          colorIndexes[index] === colorIndex && views[index] === "FRONT"
      );

      if (!hasFront) {
        return res.status(400).json({
          message: `สี "${color.name}" ต้องมีรูปภาพด้านหน้าอย่างน้อย 1 รูป`,
        });
      }
    }

    // สินค้าชุด (set): ทุกสีต้องมีรูปด้านหน้าของ SET / TOP / BOTTOM ครบ
    // (create บังคับเคร่งครัด — ชนิดรูปต้องระบุครบ เพราะ frontend wizard ส่ง pieces มาเสมอ)
    if (category.trim() === "set") {
      const requiredPieces: PieceValue[] = ["SET", "TOP", "BOTTOM"];

      for (const [colorIndex, color] of parsedColors.entries()) {
        const frontPieces = files
          .map((_, index) => index)
          .filter(
            (index) =>
              colorIndexes[index] === colorIndex && views[index] === "FRONT"
          )
          .map((index) => parsedPieces[index]);

        const present = new Set(
          frontPieces.filter((piece): piece is PieceValue => piece !== null)
        );

        const missing = requiredPieces.filter(
          (piece) => !present.has(piece)
        );

        if (missing.length > 0) {
          return res.status(400).json({
            message: `สี "${color.name}" ต้องมีรูปด้านหน้าของทั้ง SET, TOP และ BOTTOM (ขาด: ${missing.join(", ")})`,
          });
        }
      }
    }

    // จับคู่ไฟล์เข้ากับสี
    const colorsWithImages = parsedColors.map((color, colorIndex) => {
      let order = 0;

      return {
        ...color,
        images: files
          .map((file, index) => ({ file, index }))
          .filter(({ index }) => colorIndexes[index] === colorIndex)
          .map(({ file, index }) => ({
            s3_key: file.key,
            sort_order: order++,
            view: views[index],
            piece: parsedPieces[index],
          })),
      };
    });

    const product = await createProduct(brandId, {
      name: name.trim(),
      category: category.trim(),
      gender: parsedGender,
      fabric: typeof fabric === "string" && fabric.trim() ? fabric.trim() : null,
      seasons: parsedSeasons ?? [],
      occasions: parsedOccasions ?? [],
      price: price === "" ? null : price,
      description: description?.trim() || null,
      sku: sku?.trim() || null,
      // อ้างอิงตารางกลาง = ไม่สร้างตารางเฉพาะตัว
      ...(parsedSizeChartId
        ? { size_chart_id: parsedSizeChartId }
        : { size_chart: sizeChartRows ?? [] }),
      colors: colorsWithImages,
    });

    // ส่งรูปไปตรวจสอบคุณภาพด้วย Gemini แบบไม่รอผล
    for (const [index, file] of files.entries()) {
      const color = product.colors[colorIndexes[index]];

      const image = color?.images.find(
        (productImage) => productImage.s3_key === file.key
      );

      if (image) {
        void processProductImageQuality({
          imageId: image.id,
          productId: product.id,
          key: file.key,
          mimeType: file.mimetype,
          view: image.view,
        }).catch((error) => {
          console.error("Product image quality check error:", error);
        });
      }
    }

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error: any) {
    console.error("Create product error:", error);

    // ลบไฟล์ค้างใน S3 เมื่อสร้างไม่สำเร็จ
    await Promise.all(
      files.map((file) =>
        deleteImage(file.key).catch((cleanupError) => {
          console.error("S3 cleanup error:", file.key, cleanupError);
        })
      )
    );

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This SKU already exists in your store",
      });
    }

    return res.status(500).json({ message: "Failed to create product" });
  }
};


// PUT /brands/:slug/products/:id
export const updateProductController = async (
  req: Request,
  res: Response
) => {
  // ไฟล์ที่ Multer อัปโหลดเข้า S3 แล้ว
  const files = (req.files ?? []) as (Express.Multer.File & {
    key: string;
  })[];

  let success = false;

  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (!brandId) {
      return res.status(403).json({
        message: "Brand access required",
      });
    }

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const {
      name,
      category,
      price,
      description,
      sku,
      is_active,
      gender,
      fabric,
      seasons,
      occasions,
      size_chart,
      size_chart_id,
      colors,
      views: rawViews,
      color_indexes,
      pieces,
      remove_color_ids,
    } = req.body;

    // ตรวจสอบชื่อสินค้า
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "Invalid product name",
      });
    }

    // ตรวจสอบหมวดหมู่
    if (
      category !== undefined &&
      (typeof category !== "string" || !category.trim())
    ) {
      return res.status(400).json({
        message: "Invalid product category",
      });
    }

    // ตรวจสอบเพศของสินค้า (UNISEX / MALE / FEMALE — ดูที่ parsedGender ด้านล่าง)
    // แปลงและตรวจสอบราคา
    const parsedPrice =
      price === undefined
        ? undefined
        : price === "" || price === null
          ? null
          : Number(price);

    if (
      parsedPrice !== undefined &&
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      return res.status(400).json({
        message: "Invalid product price",
      });
    }

    // ตรวจสอบรายละเอียด
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid product description",
      });
    }

    // ตรวจสอบ SKU
    if (
      sku !== undefined &&
      sku !== null &&
      typeof sku !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid product SKU",
      });
    }

    // ตรวจสอบเพศสินค้า
    let parsedGender: ProductGenderValue | undefined;

    if (gender !== undefined) {
      const parsed = parseGender(gender);

      if (!parsed) {
        return res.status(400).json({ message: "Invalid product gender" });
      }

      parsedGender = parsed;
    }

    // ตรวจสอบฤดู/โอกาส
    const parsedSeasons = parseStringArray(seasons);

    if (parsedSeasons === null) {
      return res.status(400).json({ message: "Invalid seasons" });
    }

    const parsedOccasions = parseStringArray(occasions);

    if (parsedOccasions === null) {
      return res.status(400).json({ message: "Invalid occasions" });
    }

    // ตรวจสอบตารางไซส์ (undefined = ไม่แตะตารางเดิม, array = แทนที่ทั้งชุด)
    const sizeChartRows = parseSizeChart(size_chart);

    if (sizeChartRows === null) {
      return res.status(400).json({ message: "Invalid size chart" });
    }

    // ตารางไซส์กลาง (สำคัญกว่า size_chart rows ถ้าส่งมาพร้อมกัน)
    const parsedSizeChartId =
      typeof size_chart_id === "string" && size_chart_id.trim()
        ? size_chart_id.trim()
        : null;

    // หมวดหมู่ effective สำหรับตรวจข้อบังคับตารางไซส์
    let effectiveCategory = typeof category === "string" ? category.trim() : null;

    if (!effectiveCategory) {
      const existing = await getProductById(brandId, id);

      if (existing) {
        effectiveCategory = existing.category;
      }
    }

    if (
      effectiveCategory &&
      requiresSizeChart(effectiveCategory) &&
      !parsedSizeChartId &&
      (sizeChartRows === undefined || sizeChartRows.length === 0)
    ) {
      // ไม่มีทั้ง chart กลางและตารางเฉพาะตัว แต่หมวดบังคับ → ต้องตรวจว่าสินค้ายังมีตารางอยู่ไหม
      const existing = await getProductById(brandId, id);

      const stillHasRows =
        existing &&
        (existing.size_chart_id ||
          existing.size_charts.length > 0);

      if (!stillHasRows) {
        return res.status(400).json({
          message: "ต้องมีตารางไซส์อย่างน้อย 1 แถวสำหรับหมวดหมู่นี้",
        });
      }
    }

    if (parsedSizeChartId) {
      const resolved = await resolveSizeChartForProduct(
        brandId,
        parsedSizeChartId,
        effectiveCategory ?? ""
      );

      if (resolved.error === "SIZE_CHART_NOT_FOUND") {
        return res.status(400).json({ message: "ไม่พบตารางไซส์ที่เลือก" });
      }

      if (resolved.error === "SIZE_CHART_CATEGORY_MISSING") {
        return res.status(400).json({
          message: "ตารางไซส์ที่เลือกไม่มีข้อมูลสำหรับหมวดหมู่นี้",
        });
      }
    }

    // ตรวจสอบสี (undefined = ไม่แตะสีเดิม, array = สีชุดใหม่ของสินค้า)
    const parsedColors = parseColors(colors);

    if (parsedColors === null) {
      return res.status(400).json({ message: "Invalid colors" });
    }

    // ถ้ามีรูปใหม่ ต้องระบุสีปลายทางด้วย
    if (files.length > 0 && parsedColors === undefined) {
      return res.status(400).json({
        message: "ต้องระบุสีสำหรับรูปภาพที่เพิ่ม",
      });
    }

    const views = parseViews(rawViews);

    if (files.length > 0 && (!views || views.length !== files.length)) {
      return res.status(400).json({
        message: "IMAGE_VIEW_COUNT_MISMATCH",
      });
    }

    // pieces: ชนิดรูป (optional — ใช้กับสินค้าแบบชุด เช่น set)
    let parsedPieces: (PieceValue | null)[] = [];

    if (files.length > 0) {
      const result = parsePieces(pieces, files.length);

      if (!result) {
        return res.status(400).json({
          message: "IMAGE_PIECE_COUNT_MISMATCH",
        });
      }

      parsedPieces = result;
    }

    let colorIndexes: number[] = [];

    if (files.length > 0) {
      const parsedIndexes = parseColorIndexes(
        color_indexes,
        files.length,
        (parsedColors ?? []).length
      );

      if (!parsedIndexes) {
        return res.status(400).json({
          message: "Invalid color_indexes",
        });
      }

      colorIndexes = parsedIndexes;
    }

    // สีใหม่ (ไม่มี id) ต้องมีรูปด้านหน้าอย่างน้อย 1 รูป
    if (parsedColors) {
      for (const [colorIndex, color] of parsedColors.entries()) {
        if (color.id) continue;

        const hasFront =
          files.length > 0 &&
          files.some(
            (_, index) =>
              colorIndexes[index] === colorIndex && views![index] === "FRONT"
          );

        if (!hasFront) {
          return res.status(400).json({
            message: `สี "${color.name}" ต้องมีรูปภาพด้านหน้าอย่างน้อย 1 รูป`,
          });
        }
      }
    }

    // แปลง is_active จาก FormData ให้เป็น Boolean
    let parsedIsActive: boolean | undefined;

    if (is_active !== undefined) {
      if (
        is_active !== "true" &&
        is_active !== "false" &&
        typeof is_active !== "boolean"
      ) {
        return res.status(400).json({
          message: "Invalid product status",
        });
      }

      parsedIsActive =
        is_active === true || is_active === "true";
    }

    // อ่าน ID ของรูปภาพเดิมที่ต้องการลบ
    let removeImageIds: string[] = [];

    if (req.body.remove_image_ids !== undefined) {
      try {
        removeImageIds = JSON.parse(
          req.body.remove_image_ids
        );

        if (
          !Array.isArray(removeImageIds) ||
          !removeImageIds.every(
            (imageId) => typeof imageId === "string"
          ) ||
          new Set(removeImageIds).size !== removeImageIds.length
        ) {
          throw new Error("Invalid image IDs");
        }
      } catch {
        return res.status(400).json({
          message: "Invalid remove_image_ids",
        });
      }
    }

    // อ่าน ID ของสีเดิมที่ต้องการลบ (รูปในสีถูกลบตาม)
    let parsedRemoveColorIds: string[] = [];

    if (remove_color_ids !== undefined) {
      try {
        parsedRemoveColorIds = JSON.parse(remove_color_ids);

        if (
          !Array.isArray(parsedRemoveColorIds) ||
          !parsedRemoveColorIds.every((colorId) => typeof colorId === "string") ||
          new Set(parsedRemoveColorIds).size !== parsedRemoveColorIds.length
        ) {
          throw new Error("Invalid color IDs");
        }
      } catch {
        return res.status(400).json({
          message: "Invalid remove_color_ids",
        });
      }
    }

    // สินค้าชุด (set): ตรวจสถานะรวมหลังบันทึกว่าทุกสีมีรูปด้านหน้าของ SET / TOP / BOTTOM ครบ
    // (รูปเดิมที่ยังไม่ระบุชนิด piece = null นับเป็นตัวรองทุกชนิด เพื่อไม่บล็อกสินค้าเก่าที่แก้ไข)
    if (effectiveCategory === "set") {
      const existingProduct = await getProductById(brandId, id);

      if (existingProduct) {
        type SetColorCheck = { name: string; pieces: (PieceValue | null)[] };

        const requiredPieces: PieceValue[] = ["SET", "TOP", "BOTTOM"];

        // รูปเดิมของแต่ละสี (หักรูปที่ขอลบ) — เฉพาะสีที่ยังไม่ถูกลบ
        const frontPiecesByColorId = new Map<string, (PieceValue | null)[]>();

        for (const color of existingProduct.colors) {
          if (parsedRemoveColorIds.includes(color.id)) continue;

          frontPiecesByColorId.set(
            color.id,
            color.images
              .filter(
                (image) =>
                  image.view === "FRONT" && !removeImageIds.includes(image.id)
              )
              .map((image) => image.piece)
          );
        }

        // รูปใหม่ผูกกับสีตำแหน่งไหน — สีเดิมเติมเข้า id เดิม, สีใหม่เก็บตามตำแหน่ง
        const frontPiecesByNewColorIndex = new Map<
          number,
          (PieceValue | null)[]
        >();

        (parsedColors ?? []).forEach((color, index) => {
          const newFrontPieces = files
            .map((_, fileIndex) => fileIndex)
            .filter(
              (fileIndex) =>
                colorIndexes[fileIndex] === index &&
                views![fileIndex] === "FRONT"
            )
            .map((fileIndex) => parsedPieces[fileIndex]);

          if (newFrontPieces.length === 0) return;

          if (color.id && frontPiecesByColorId.has(color.id)) {
            frontPiecesByColorId.set(color.id, [
              ...frontPiecesByColorId.get(color.id)!,
              ...newFrontPieces,
            ]);
          } else if (!color.id) {
            frontPiecesByNewColorIndex.set(index, [
              ...(frontPiecesByNewColorIndex.get(index) ?? []),
              ...newFrontPieces,
            ]);
          }
        });

        const colorsToCheck: SetColorCheck[] = [
          ...existingProduct.colors
            .filter((color) => !parsedRemoveColorIds.includes(color.id))
            .map((color) => ({
              name: color.name,
              pieces: frontPiecesByColorId.get(color.id) ?? [],
            })),
          ...(parsedColors ?? [])
            .map((color, index) =>
              !color.id && frontPiecesByNewColorIndex.has(index)
                ? {
                    name: color.name,
                    pieces: frontPiecesByNewColorIndex.get(index)!,
                  }
                : null
            )
            .filter((item): item is SetColorCheck => item !== null),
        ];

        for (const color of colorsToCheck) {
          const present = new Set(color.pieces);

          const missing = requiredPieces.filter(
            (piece) => !present.has(piece) && !present.has(null)
          );

          if (missing.length > 0) {
            return res.status(400).json({
              message: `สี "${color.name}" ต้องมีรูปด้านหน้าของทั้ง SET, TOP และ BOTTOM (ขาด: ${missing.join(", ")})`,
            });
          }
        }
      }
    }

    // เรียก Service เพื่อแก้ไขสินค้าและรูปภาพ
    const result = await updateProductWithImages(
      brandId,
      id,
      {
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),

          ...(category !== undefined && {
            category: category.trim(),
          }),

        ...(parsedGender !== undefined && {
          gender: parsedGender,
        }),

        ...(fabric !== undefined && {
            fabric:
              typeof fabric === "string" && fabric.trim()
                ? fabric.trim()
                : null,
          }),

          ...(parsedSeasons !== undefined && {
            seasons: parsedSeasons,
          }),

          ...(parsedOccasions !== undefined && {
            occasions: parsedOccasions,
          }),

          ...(price !== undefined && {
            price: parsedPrice,
          }),

          ...(description !== undefined && {
            description:
              description === null
                ? null
                : description.trim() || null,
          }),

          ...(sku !== undefined && {
            sku:
              sku === null
                ? null
                : sku.trim() || null,
          }),

          ...(is_active !== undefined && {
            is_active: parsedIsActive!,
          }),

          // อ้างอิงตารางไซส์กลาง (ส่งค่าว่างได้ = เลิกอ้างอิง)
          ...(size_chart_id !== undefined && {
            size_chart_id: parsedSizeChartId,
          }),
        },
        newImages: files.map((file, index) => ({
          s3_key: file.key,
          sort_order: index,
          view: views![index],
          color_index: colorIndexes[index],
          piece: parsedPieces[index],
        })),
        colors: parsedColors ?? [],
        removeImageIds,
        removeColorIds: parsedRemoveColorIds,
        ...(sizeChartRows !== undefined && {
          size_chart: sizeChartRows,
        }),
      }
    );

    if (!result) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // บันทึกสำเร็จ ไม่ต้อง cleanup รูปใหม่
    success = true;

    // ตรวจสอบคุณภาพรูปภาพใหม่
    for (const [index, file] of files.entries()) {
      const image = result.newImages[index];

      if (image) {
        void processProductImageQuality({
          imageId: image.id,
          productId: id,
          key: file.key,
          mimeType: file.mimetype,
          view: image.view,
        }).catch((error) => {
          console.error(
            "Product image quality check error:",
            error
          );
        });
      }
    }

    return res.status(200).json({
      message: "Product updated successfully",
      product: result.product,
    });

  } catch (error: any) {
    console.error("Update product error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This SKU already exists in your store",
      });
    }

    if (error.message === "INVALID_IMAGE_IDS") {
      return res.status(400).json({
        message: "Invalid image IDs",
      });
    }

    if (error.message === "INVALID_COLOR_IDS") {
      return res.status(400).json({
        message: "Invalid color IDs",
      });
    }

    if (error.message === "INVALID_COLOR_INDEX") {
      return res.status(400).json({
        message: "Invalid color index",
      });
    }

    return res.status(500).json({
      message: "Failed to update product",
    });

  } finally {
    // หากการอัปเดตไม่สำเร็จ ให้ลบรูปใหม่ที่อัปโหลดค้างไว้
    if (!success) {
      await Promise.all(
        files.map((file) =>
          deleteImage(file.key).catch((error) => {
            console.error(
              "S3 cleanup error:",
              file.key,
              error
            );
          })
        )
      );
    }
  }
};



// DELETE /brands/:slug/products/:id
export const deleteProductController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (typeof id !== "string") {
    return res.status(400).json({
        message: "Invalid product ID",
    });
    }

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const deleted = await deleteProduct(brandId, id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
};

// ส่งรายการสินค้าทุกร้านให้ Super Admin
export const getAdminProductsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const products = await getAdminProducts();
    return res.status(200).json({
      message: "Products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Get admin products error:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

// ส่งตัวเลขสรุปสถานะผลตรวจรูปสำหรับการ์ดสถิติ
export const getAdminProductStatsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const stats = await getAdminProductStats();
    return res.status(200).json({
      message: "Stats fetched successfully",
      stats,
    });
  } catch (error) {
    console.error("Get admin product stats error:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};