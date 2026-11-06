import api from "./api";

export type BrandStatus = "PENDING" | "APPROVED" | "REJECTED";

export type RegisterBrandResponse = {
  id: string;
  brand_name: string;
  status: BrandStatus;
  created_at: string;
};

export type Brand = {
  id: string;
  brand_name: string;
  owner_name: string;
  email: string | null;
  store_url: string | null;
  status: BrandStatus;
  created_at: string;
};

export type BrandDetail = Brand & {
  phone_number: string | null;
  ebiz_reg_no: string | null;
  ebiz_file_url: string | null;
};

export type CheckBrandAccessResponse = {
  authorized: boolean;
  brand: {
    id: string;
    brand_name: string;
    slug: string | null;
    status: BrandStatus;
  };
  role: "OWNER" | "ADMIN";
};



export async function registerBrand(formData: FormData): Promise<RegisterBrandResponse> {
  const response = await api.post("/brands/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getBrands(): Promise<Brand[]> {
  const response = await api.get("/brands");
  return response.data;
}

export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/brands/${id}`);
} 


export async function getBrandById(id: string): Promise<BrandDetail> {
  const response = await api.get(`/brands/${id}`);
  return response.data;
}

export async function updateBrandStatus(id: string, status: BrandStatus): Promise<BrandDetail> {
  const response = await api.put(`/brands/${id}/status`, { status });
  return response.data;
}

export async function checkBrandAccess(
  slug: string
): Promise<CheckBrandAccessResponse> {
  const response = await api.get<CheckBrandAccessResponse>(
    `/brands/${encodeURIComponent(slug)}/access`
  );

  return response.data;
}

