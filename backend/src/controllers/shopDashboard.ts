import { Request, Response } from "express";
import {
  getShopDashboard,
  SHOP_DASHBOARD_DAYS,
  type ShopDashboardDays,
} from "../services/shopDashboardService";

// GET /brands/:slug/dashboard?days=7|30|90
// ต้องผ่าน adminAuthMiddleware + requireBrandAccess มาก่อน (req.brand ถูกแนบไว้แล้ว)
export const getShopDashboardController = async (req: Request, res: Response) => {
  const brandId = req.brand?.id;
  if (!brandId) {
    return res.status(403).json({ message: "Brand access denied" });
  }

  const requested = Number(req.query.days ?? 30);
  const days = (SHOP_DASHBOARD_DAYS as readonly number[]).includes(requested)
    ? (requested as ShopDashboardDays)
    : 30;

  try {
    const dashboard = await getShopDashboard(brandId, days);
    return res.status(200).json(dashboard);
  } catch (error) {
    console.error("Get shop dashboard error:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard" });
  }
};
