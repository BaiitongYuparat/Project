import { Request, Response } from "express";
import {
  getPlatformDashboard,
  type DashboardRange,
} from "../services/dashboardService";

const RANGE_VALUES: DashboardRange[] = ["day", "week", "month", "year", "custom"];

// GET /admin/dashboard?range=day|week|month|year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
export const getDashboard = async (req: Request, res: Response) => {
  const rawRange = String(req.query.range ?? "day");
  const range = RANGE_VALUES.includes(rawRange as DashboardRange)
    ? (rawRange as DashboardRange)
    : "day";

  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  try {
    const data = await getPlatformDashboard(range, from, to);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};
