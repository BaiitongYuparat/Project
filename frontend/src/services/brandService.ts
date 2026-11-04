import api from "./api";

export type RegisterBrandResponse = {
  id: string;
  brand_name: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
};

export async function registerBrand(formData: FormData): Promise<RegisterBrandResponse> {
  const response = await api.post("/brands/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}