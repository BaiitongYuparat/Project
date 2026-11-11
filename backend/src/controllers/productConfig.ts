import { Request, Response } from "express";
import {
  getProductOptions,
  getSizeChartTemplates,
} from "../services/productService";

// GET /size-chart-templates?gender=MALE&category=top
// ตารางไซส์ standard ของแพลตฟอร์ม (filter ตาม gender/category ได้)
export const getSizeChartTemplatesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { gender, category } = req.query;

    const templates = await getSizeChartTemplates({
      ...(typeof gender === "string" &&
        ["UNISEX", "MALE", "FEMALE"].includes(gender) && {
          gender: gender as "UNISEX" | "MALE" | "FEMALE",
        }),
      ...(typeof category === "string" && category.trim()
        ? { category: category.trim() }
        : {}),
    });

    return res.status(200).json({
      message: "Size chart templates fetched successfully",
      templates,
    });
  } catch (error) {
    console.error("Get size chart templates error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch size chart templates" });
  }
};

// GET /product-options
// ชุดตัวเลือกฤดู/โอกาส ที่ super admin จัดการค่าไว้
export const getProductOptionsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const options = await getProductOptions();

    return res.status(200).json({
      message: "Product options fetched successfully",
      options,
    });
  } catch (error) {
    console.error("Get product options error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch product options" });
  }
};
