import api from "../api";

// Dashboard ของร้าน (Shop Admin) — สถิติ Virtual Try-On เฉพาะร้านตัวเอง
// GET /brands/:slug/dashboard?days=7|30|90

export const DASHBOARD_DAY_OPTIONS = [7, 30, 90] as const;
export type DashboardDays = (typeof DASHBOARD_DAY_OPTIONS)[number];

export type ShopDashboard = {
  range: {
    days: number;
    from: string;
    to: string;
  };
  totals: {
    tryons: { value: number; change: number | null };
    users: { value: number; change: number | null };
    activeProducts: number;
  };
  series: { date: string; count: number }[];
  topProducts: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
    count: number;
  }[];
  categories: { category: string; count: number }[];
};

export async function getShopDashboard(
  slug: string,
  days: DashboardDays
): Promise<ShopDashboard> {
  const response = await api.get<ShopDashboard>(`/brands/${slug}/dashboard`, {
    params: { days },
  });
  return response.data;
}
