import api from "./api";

export interface Shop {
  id: string;
  brand_name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  
}


export const getShops = async (): Promise<Shop[]> => {

  const response = await api.get<Shop[]>("/shops");

  return response.data;
};