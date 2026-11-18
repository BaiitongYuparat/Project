import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  createTryOn,
  parseView,
  serializeTryOn,
  TryOnInputError,
  TryOnItem,
  TryOnSource,
} from "../services/tryon/tryOnService";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { s3 } from "../middlewares/upload";
import { getTryOnConfig, saveTryOnConfig } from "../services/tryon/config";

const parseItems = (raw: unknown): TryOnItem[] | null => {
  if (!Array.isArray(raw)) return null;
  const items: TryOnItem[] = [];
  for (const r of raw) {
    if (!r || typeof r.product_id !== "string") return null;
    items.push({
      product_id: r.product_id,
      color_id: typeof r.color_id === "string" ? r.color_id : null,
    });
  }
  return items;
};

// POST /tryon  { view, items: [{product_id, color_id?}], source?: {type:"body"} | {type:"model", model_id}, regenerate?: boolean }
// ชุดเดิมที่เคยสำเร็จแล้วจะได้ผลเดิมทันที (status SUCCESS) — ส่ง regenerate: true เพื่อสร้างใหม่
export const startTryOn = async (req: Request, res: Response) => {
  try {
    const view = parseView(req.body?.view ?? "front");
    const items = parseItems(req.body?.items);
    if (!view) return res.status(400).json({ message: "view must be front, back, left or right" });
    if (!items) return res.status(400).json({ message: "items must be [{ product_id, color_id? }]" });

    const s = req.body?.source;
    const source: TryOnSource =
      s?.type === "model" && typeof s.model_id === "string"
        ? { type: "model", model_id: s.model_id }
        : { type: "body" };

    const log = await createTryOn({
      userId: req.user!.id,
      source,
      view,
      items,
      regenerate: req.body?.regenerate === true,
    });
    return res.status(202).json({ id: log.id, status: log.status });
  } catch (err) {
    if (err instanceof TryOnInputError) return res.status(err.status).json({ message: err.message });
    console.error("startTryOn error:", err);
    return res.status(500).json({ message: "Failed to start try-on" });
  }
};

// GET /tryon/:id — poll สถานะ (เจ้าของเท่านั้น)
export const getTryOn = async (req: Request, res: Response) => {
  try {
    const log = await prisma.tryOnLog.findFirst({
      where: { id: String(req.params.id), user_id: req.user!.id },
    });
    if (!log) return res.status(404).json({ message: "Not found" });
    return res.json(await serializeTryOn(log));
  } catch (err) {
    console.error("getTryOn error:", err);
    return res.status(500).json({ message: "Failed to load try-on" });
  }
};

// GET /tryon/:id/download — ส่งไฟล์ภาพให้ดาวน์โหลด (เจ้าของเท่านั้น; stream ผ่าน backend กันปัญหา CORS ของ S3)
export const downloadTryOn = async (req: Request, res: Response) => {
  try {
    const log = await prisma.tryOnLog.findFirst({
      where: { id: String(req.params.id), user_id: req.user!.id, status: "SUCCESS" },
    });
    if (!log?.result_s3_key) return res.status(404).json({ message: "Not found" });

    const object = await s3.send(
      new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: log.result_s3_key }),
    );
    if (!object.Body) return res.status(404).json({ message: "Not found" });

    res.setHeader("Content-Type", object.ContentType ?? "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="tryon-${log.id}.png"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    (object.Body as Readable).pipe(res);
  } catch (err) {
    console.error("downloadTryOn error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Failed to download" });
  }
};

// GET /tryon — ประวัติล่าสุด
export const listTryOns = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.tryOnLog.findMany({
      where: { user_id: req.user!.id, status: "SUCCESS" },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    return res.json(await Promise.all(logs.map(serializeTryOn)));
  } catch (err) {
    console.error("listTryOns error:", err);
    return res.status(500).json({ message: "Failed to load history" });
  }
};

// ---------- super admin: ตั้งค่า provider / prompt ----------
export const getTryOnConfigAdmin = async (_req: Request, res: Response) => {
  try {
    return res.json(await getTryOnConfig());
  } catch (err) {
    console.error("getTryOnConfig error:", err);
    return res.status(500).json({ message: "Failed to load config" });
  }
};

export const updateTryOnConfigAdmin = async (req: Request, res: Response) => {
  try {
    return res.json(await saveTryOnConfig(req.body ?? {}, req.admin!.id));
  } catch (err) {
    console.error("updateTryOnConfig error:", err);
    return res.status(500).json({ message: "Failed to save config" });
  }
};
