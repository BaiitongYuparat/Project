import { Request, Response } from "express";
import {
  createBrandSizeChart,
  deleteBrandSizeChart,
  getBrandSizeChartById,
  getBrandSizeCharts,
  updateBrandSizeChart,
  type SizeChartPayload,
} from "../services/sizeChartService";

const CATEGORIES = ["top", "bottom", "dress"];

// แปลง body -> payload (null = รูปแบบไม่ถูกต้อง)
const parsePayload = (body: Record<string, unknown>): SizeChartPayload | null => {
  const { name, gender, entries, is_freesize } = body;

  if (typeof name !== "string" || !name.trim()) return null;

  if (
    gender !== undefined &&
    gender !== null &&
    !["UNISEX", "MALE", "FEMALE"].includes(String(gender))
  ) {
    return null;
  }

  let parsedEntries: unknown;

  try {
    parsedEntries =
      typeof entries === "string" ? JSON.parse(entries) : entries;
  } catch {
    return null;
  }

  if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
    return null;
  }

  const normalized: SizeChartPayload["entries"] = [];

  for (const item of parsedEntries) {
    if (
      !item ||
      typeof item.category !== "string" ||
      !CATEGORIES.includes(item.category)
    ) {
      return null;
    }

    const rows = item.rows;

    if (!Array.isArray(rows)) return null;

    for (const row of rows) {
      if (!row || typeof row.size !== "string" || !row.size.trim()) {
        return null;
      }
    }

    // category ซ้ำใน collection เดียวกันไม่ได้
    if (normalized.some((entry) => entry.category === item.category)) {
      return null;
    }

    normalized.push({
      category: item.category,
      rows: rows.map((row: Record<string, unknown>) => ({
        size: String(row.size),
        chest: (row.chest ?? null) as number | string | null,
        waist: (row.waist ?? null) as number | string | null,
        hips: (row.hips ?? null) as number | string | null,
        length: (row.length ?? null) as number | string | null,
      })),
    });
  }

  return {
    name: name.trim(),
    ...(gender ? { gender: String(gender) as "UNISEX" | "MALE" | "FEMALE" } : {}),
    // Free Size = ไซส์เดียว (ใช้ได้กับทุกหมวด)
    is_freesize: is_freesize === true,
    entries: normalized,
  };
};

// GET /brands/:slug/size-charts
export const getBrandSizeChartsController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const charts = await getBrandSizeCharts(brandId);

    return res.status(200).json({
      message: "Size charts fetched successfully",
      charts,
    });
  } catch (error) {
    console.error("Get size charts error:", error);
    return res.status(500).json({ message: "Failed to fetch size charts" });
  }
};

// GET /brands/:slug/size-charts/:id
export const getBrandSizeChartByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    if (typeof id !== "string" || !id) {
      return res.status(400).json({ message: "Invalid size chart ID" });
    }

    const chart = await getBrandSizeChartById(brandId, id);

    if (!chart) {
      return res.status(404).json({ message: "Size chart not found" });
    }

    return res.status(200).json({
      message: "Size chart fetched successfully",
      chart,
    });
  } catch (error) {
    console.error("Get size chart error:", error);
    return res.status(500).json({ message: "Failed to fetch size chart" });
  }
};

// POST /brands/:slug/size-charts
export const createBrandSizeChartController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    const payload = parsePayload(req.body);

    if (!payload) {
      return res.status(400).json({ message: "Invalid size chart payload" });
    }

    const chart = await createBrandSizeChart(brandId, payload);

    return res.status(201).json({
      message: "Size chart created successfully",
      chart,
    });
  } catch (error: any) {
    console.error("Create size chart error:", error);

    if (error.message === "SIZE_CHART_NAME_DUPLICATE") {
      return res.status(409).json({
        message: "มีตารางไซส์ชื่อนี้อยู่แล้วในร้านของคุณ",
      });
    }

    return res.status(500).json({ message: "Failed to create size chart" });
  }
};

// PUT /brands/:slug/size-charts/:id
export const updateBrandSizeChartController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    if (typeof id !== "string" || !id) {
      return res.status(400).json({ message: "Invalid size chart ID" });
    }

    const payload = parsePayload(req.body);

    if (!payload) {
      return res.status(400).json({ message: "Invalid size chart payload" });
    }

    const chart = await updateBrandSizeChart(brandId, id, payload);

    if (!chart) {
      return res.status(404).json({ message: "Size chart not found" });
    }

    return res.status(200).json({
      message: "Size chart updated successfully",
      chart,
    });
  } catch (error: any) {
    console.error("Update size chart error:", error);

    if (error.message === "SIZE_CHART_NAME_DUPLICATE") {
      return res.status(409).json({
        message: "มีตารางไซส์ชื่อนี้อยู่แล้วในร้านของคุณ",
      });
    }

    return res.status(500).json({ message: "Failed to update size chart" });
  }
};

// DELETE /brands/:slug/size-charts/:id
export const deleteBrandSizeChartController = async (
  req: Request,
  res: Response
) => {
  try {
    const brandId = req.brand?.id;
    const id = req.params.id;

    if (!brandId) {
      return res.status(403).json({ message: "Brand access required" });
    }

    if (typeof id !== "string" || !id) {
      return res.status(400).json({ message: "Invalid size chart ID" });
    }

    const deleted = await deleteBrandSizeChart(brandId, id);

    if (!deleted) {
      return res.status(404).json({ message: "Size chart not found" });
    }

    return res.status(200).json({
      message: "Size chart deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete size chart error:", error);

    if (error.message === "SIZE_CHART_IN_USE") {
      return res.status(409).json({
        message: "ไม่สามารถลบตารางไซส์ที่มีสินค้าใช้อ้างอิงอยู่ได้",
      });
    }

    return res.status(500).json({ message: "Failed to delete size chart" });
  }
};
