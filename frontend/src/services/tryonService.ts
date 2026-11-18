import { isAxiosError } from "axios";

import api from "./api";
import type { Angle } from "../components/tryon/types";

export type TryOnStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface TryOnJob {
  id: string;
  status: TryOnStatus;
  error_code: string | null;
  view: Angle | null;
  image_url: string | null;
  created_at: string;
}

export type TryOnSourceInput = { type: "body" } | { type: "model"; model_id: string };

export interface StartTryOnInput {
  view: Angle;
  source: TryOnSourceInput;
  items: { product_id: string }[];
}

/** สร้างงาน generate (backend ตอบ 202 แล้วทำงานเบื้องหลัง) */
export async function startTryOn(input: StartTryOnInput): Promise<{ id: string; status: TryOnStatus }> {
  const response = await api.post<{ id: string; status: TryOnStatus }>("/tryon", input);
  return response.data;
}

export async function getTryOn(id: string): Promise<TryOnJob> {
  const response = await api.get<TryOnJob>(`/tryon/${id}`);
  return response.data;
}

/** ข้อความ error ที่ backend ส่งมา (4xx เป็นภาษาไทยอยู่แล้ว) */
export function tryOnErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return "สร้างภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

/** แปลง error_code ของงานที่ FAILED เป็นข้อความที่ผู้ใช้เข้าใจ */
export function failedJobMessage(code: string | null): string {
  if (code === "FAL_INVALID_INPUT" || code === "BFL_MODERATED") {
    return "ระบบตรวจสอบรูปไม่ผ่าน ลองเปลี่ยนโมเดลหรือสินค้าแล้วลองใหม่";
  }
  if (code?.endsWith("TIMEOUT")) return "ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง";
  return "สร้างภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const POLL_INTERVAL_MS = 2000;
// ต้องมากกว่า timeout รวมของ provider ทั้งสายใน backend (60+60+90 = 210s)
const POLL_TIMEOUT_MS = 4 * 60 * 1000;

/** poll จนงานเสร็จ — เรียก signal.aborted เพื่อยกเลิก (เช่น ออกจากหน้า) */
export async function waitForTryOn(id: string, signal: AbortSignal): Promise<TryOnJob> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (!signal.aborted && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (signal.aborted) break;
    const job = await getTryOn(id);
    if (job.status !== "PENDING") return job;
  }
  throw new DOMException(signal.aborted ? "aborted" : "timeout", signal.aborted ? "AbortError" : "TimeoutError");
}
