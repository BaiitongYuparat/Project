import api from "../api";
import type {
  Model,
  ModelFormData,
  ModelStatusPayload,
  ImageSlot,
} from "../../types/model";

const baseUrl = "/admin/models";

const IMAGE_SLOTS: ImageSlot[] = ["image_front", "image_back", "image_left", "image_right"];

/** สร้าง FormData จากค่าฟอร์ม — แนบไฟล์รายมุม + รายการมุมที่ล้าง */
const buildFormData = (data: ModelFormData): FormData => {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("gender", data.gender ?? "");
  formData.append("bust", data.bust);
  formData.append("waist", data.waist);
  formData.append("hips", data.hips);
  formData.append("height", data.height);
  formData.append("supported_sizes", JSON.stringify(data.supported_sizes));
  formData.append("is_selectable", String(data.is_selectable));
  for (const slot of IMAGE_SLOTS) {
    const file = data.images[slot];
    if (file) {
      formData.append(slot, file);
    }
  }
  if (data.removedImages.length > 0) {
    formData.append("remove_images", JSON.stringify(data.removedImages));
  }
  return formData;
};

export async function getModels(): Promise<Model[]> {
  const response = await api.get(baseUrl);
  return response.data;
}

export async function createModel(data: ModelFormData): Promise<Model> {
  const response = await api.post(baseUrl, buildFormData(data));
  return response.data;
}

export async function updateModel(id: string, data: ModelFormData): Promise<Model> {
  const response = await api.put(`${baseUrl}/${id}`, buildFormData(data));
  return response.data;
}

export async function setModelStatus(id: string, payload: ModelStatusPayload): Promise<Model> {
  const response = await api.put(`${baseUrl}/${id}/status`, payload);
  return response.data;
}

export async function deleteModel(id: string): Promise<void> {
  await api.delete(`${baseUrl}/${id}`);
}
