import api from "../api";

// สถิติภาพรวมแพลตฟอร์ม — ใช้ในหน้า Dashboard ของ Super Admin
// GET /admin/dashboard (ต้องเป็น super admin เท่านั้น)

export type DashboardRange = "day" | "week" | "month" | "year" | "custom";
export type DashboardBucket = "day" | "week" | "month" | "year";

export type DashboardStats = {
  range: {
    from: string;
    to: string;
    unit: DashboardBucket;
  };
  totals: {
    brands: number;
    users: number;
    requests: number;
    failed: number;
    cost: number; // USD
    avgDurationMs: number | null;
    cacheHits: number;
  };
  byProvider: { provider: string; count: number; cost: number }[];
  pending: {
    brands: number;
    appeals: number;
    ownerTransfers: number;
    aiReports: number;
  };
  series: {
    date: string;
    requests: number;
    success: number;
    cost: number;
  }[];
  topBrands: {
    id: string;
    brand_name: string;
    count: number;
  }[];
  brands: {
    id: string;
    brand_name: string;
    owner_name: string;
    email: string | null;
    status: string;
    products: number;
    tryons: number;
    cost: number;
  }[];
};

export async function getDashboardStats(
  range: DashboardRange,
  custom?: { from: string; to: string }
): Promise<DashboardStats> {
  const response = await api.get<DashboardStats>("/admin/dashboard", {
    params: {
      range,
      ...(range === "custom" && custom ? { from: custom.from, to: custom.to } : {}),
    },
  });
  return response.data;
}
