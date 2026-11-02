import api from "./api";

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  
}


export const mockShops: Shop[] = [
  {
    id: "shop-1",
    name: "Fashion House",
    slug: "fashion-house",
  },
  {
    id: "shop-2",
    name: "Daily Wear",
    slug: "daily-wear",
  },
  {
    id: "shop-3",
    name: "Minimal Store",
    slug: "minimal-store",
  },
];



const USE_MOCK_DATA = "true";

export const getShops = async (): Promise<Shop[]> => {
  if (USE_MOCK_DATA) {
    return mockShops;
  }

  const response = await api.get<Shop[]>("/shops");

  return response.data;
};