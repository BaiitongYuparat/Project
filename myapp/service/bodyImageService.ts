import api from "./api";

export interface SavedImage {
  angle: string;
  s3: string;
}

export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export async function getBodyImages(bodyId: string): Promise<SavedImage[]> {
  const res = await api.get(`/images/body/${bodyId}`);
  return res.data.data;
}

/** ส่งรูปให้ backend ตรวจ (AI) — ผ่านแล้วได้ tempKey กลับมา */
export async function verifyBodyImage(angle: string, image: PickedImage): Promise<string> {
  const mimeType = image.mimeType ?? "image/jpeg";
  const ext = mimeType.split("/")[1] ?? "jpg";
  const formData = new FormData();
  // React Native FormData รับ object { uri, name, type } แทน File
  formData.append("image", {
    uri: image.uri,
    name: image.fileName ?? `${angle}.${ext}`,
    type: mimeType,
  } as unknown as Blob);

  const res = await api.post(`/images/verify/${angle}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.tempKey;
}

export async function saveBodyImages(
  bodyId: string,
  tempKeys: Partial<Record<string, string>>,
): Promise<void> {
  await api.post("/images/body", { body_id: bodyId, tempKeys });
}
