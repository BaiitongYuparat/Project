import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { ImageView, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { s3 } from "../../middlewares/upload";
import { deleteImage, getImageUrl } from "../../utils/s3Utils";
import { getProviderOrder, getTryOnConfig } from "./config";
import {
  ProviderName,
  runProvider,
  TryOnProviderError,
  TryOnRunResult,
} from "./providers";

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;
const MAX_ITEMS = 4; // canvas 2x2
const CANVAS_PX = 1024; // ≤1MP ตามที่ BFL/fal แนะนำสำหรับ garment
const PERSON_MAX_PX = 1024;
const MAX_PENDING_PER_USER = 2;
const DAILY_LIMIT = Number(process.env.TRYON_DAILY_LIMIT ?? 30);

export class TryOnInputError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
  }
}

export type TryOnItem = { product_id: string; color_id?: string | null };
export type TryOnSource = { type: "body" } | { type: "model"; model_id: string };

const VIEWS: Record<string, ImageView> = {
  front: "FRONT",
  back: "BACK",
  left: "LEFT",
  right: "RIGHT",
};

export const parseView = (v: unknown): ImageView | null =>
  typeof v === "string" ? VIEWS[v.toLowerCase()] ?? null : null;

// ---------- S3 helpers ----------
const getObjectBuffer = async (key: string): Promise<Buffer> => {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return Buffer.from(await obj.Body!.transformToByteArray());
};

const putJpeg = async (key: string, body: Buffer) => {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "image/jpeg" })
  );
};

// ---------- resolve inputs ----------
const personKey = async (userId: string, source: TryOnSource, view: ImageView): Promise<string> => {
  if (source.type === "model") {
    const model = await prisma.model.findFirst({
      where: { id: source.model_id, is_active: true, is_selectable: true },
    });
    if (!model) throw new TryOnInputError("ไม่พบโมเดลที่เลือก", 404);
    const key = {
      FRONT: model.image_front,
      BACK: model.image_back,
      LEFT: model.image_left,
      RIGHT: model.image_right,
    }[view];
    if (!key) throw new TryOnInputError(`โมเดลนี้ไม่มีรูปด้าน ${view.toLowerCase()}`, 422);
    return key;
  }

  const body = await prisma.body.findFirst({
    where: { user_id: userId },
    orderBy: { recorded_at: "desc" },
    include: { images: { where: { angle: view.toLowerCase() } } },
  });
  const image = body?.images[0];
  if (!image) throw new TryOnInputError(`ยังไม่มีรูปร่างของคุณด้าน ${view.toLowerCase()}`, 422);
  return image.s3;
};

type ResolvedGarment = { keys: string[]; description: string; brandId: string; productId: string };

const resolveGarment = async (item: TryOnItem, view: ImageView): Promise<ResolvedGarment> => {
  const product = await prisma.product.findFirst({
    where: { id: item.product_id, is_active: true },
    include: {
      colors: true,
      images: {
        where: {
          view,
          quality_status: { not: "FAILED" },
          ...(item.color_id ? { color_id: item.color_id } : {}),
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });
  if (!product) throw new TryOnInputError("ไม่พบสินค้าที่เลือก", 404);
  if (product.images.length === 0) {
    throw new TryOnInputError(`สินค้า "${product.name}" ไม่มีรูปด้าน ${view.toLowerCase()}`, 422);
  }

  // รูปทั้งชุด (SET/ไม่ระบุ) ใช้ได้เลย; ถ้ามีแต่ TOP/BOTTOM แยกท่อน ให้ใช้ทั้งสองท่อน
  const whole = product.images.find((i) => !i.piece || i.piece === "SET");
  const picked = whole
    ? [whole]
    : [
        product.images.find((i) => i.piece === "TOP"),
        product.images.find((i) => i.piece === "BOTTOM"),
      ].filter((i): i is NonNullable<typeof i> => Boolean(i));

  const colorId = item.color_id ?? picked[0].color_id;
  const color = product.colors.find((c) => c.id === colorId);
  return {
    keys: picked.map((i) => i.s3_key),
    description: [color?.name, product.name].filter(Boolean).join(" "),
    brandId: product.brand_id,
    productId: product.id,
  };
};

// ---------- canvas ----------
// API รับ garment ได้ช่องเดียว → รวมหลายชิ้นเป็น grid บนพื้นขาวตามที่ BFL docs แนะนำ
export const composeGarmentCanvas = async (keys: string[]): Promise<Buffer> => {
  const buffers = await Promise.all(keys.map(getObjectBuffer));
  if (buffers.length === 1) {
    return sharp(buffers[0])
      .rotate()
      .resize(CANVAS_PX, CANVAS_PX, { fit: "inside", withoutEnlargement: false })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toBuffer();
  }
  const cols = Math.ceil(Math.sqrt(buffers.length));
  const rows = Math.ceil(buffers.length / cols);
  const cellW = Math.floor(CANVAS_PX / cols);
  const cellH = Math.floor(CANVAS_PX / rows);
  const cells = await Promise.all(
    buffers.map(async (buf, i) => ({
      input: await sharp(buf)
        .rotate()
        .resize(cellW, cellH, { fit: "contain", background: "#ffffff" })
        .flatten({ background: "#ffffff" })
        .toBuffer(),
      left: (i % cols) * cellW,
      top: Math.floor(i / cols) * cellH,
    }))
  );
  return sharp({
    create: { width: cellW * cols, height: cellH * rows, channels: 3, background: "#ffffff" },
  })
    .composite(cells)
    .jpeg({ quality: 92 })
    .toBuffer();
};

const preparePerson = (key: string) =>
  getObjectBuffer(key).then((buf) =>
    sharp(buf)
      .rotate()
      .resize(PERSON_MAX_PX, PERSON_MAX_PX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer()
  );

// ---------- create job ----------
export type CreateTryOnParams = {
  userId: string;
  source: TryOnSource;
  view: ImageView;
  items: TryOnItem[];
};

export const createTryOn = async (params: CreateTryOnParams) => {
  const { userId, source, view, items } = params;
  if (items.length < 1 || items.length > MAX_ITEMS) {
    throw new TryOnInputError(`เลือกสินค้าได้ 1–${MAX_ITEMS} ชิ้นต่อครั้ง`);
  }
  const config = await getTryOnConfig();
  if (getProviderOrder(config).length === 0) {
    throw new TryOnInputError("ฟีเจอร์ลองเสื้อยังไม่เปิดใช้งาน", 503);
  }

  // คุมค่าใช้จ่าย: จำกัดงานค้างและจำนวนต่อวันต่อผู้ใช้
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [pending, today] = await Promise.all([
    prisma.tryOnLog.count({ where: { user_id: userId, status: "PENDING" } }),
    prisma.tryOnLog.count({ where: { user_id: userId, created_at: { gte: startOfDay } } }),
  ]);
  if (pending >= MAX_PENDING_PER_USER) throw new TryOnInputError("มีงานที่กำลังประมวลผลอยู่ กรุณารอสักครู่", 429);
  if (today >= DAILY_LIMIT) throw new TryOnInputError("ใช้ครบโควตาลองเสื้อวันนี้แล้ว", 429);

  const [pKey, garments] = await Promise.all([
    personKey(userId, source, view),
    Promise.all(items.map((i) => resolveGarment(i, view))),
  ]);

  const log = await prisma.tryOnLog.create({
    data: {
      user_id: userId,
      brand_id: garments[0].brandId,
      product_id: garments[0].productId,
      model_id: source.type === "model" ? source.model_id : null,
      status: "PENDING",
      view,
      items: items as unknown as Prisma.InputJsonValue,
    },
  });

  // รันเบื้องหลัง (pattern เดียวกับ productImageQuality) — client poll GET /tryon/:id
  void runTryOn(log.id, userId, pKey, garments).catch((err) =>
    console.error("[tryon] unexpected failure", log.id, err)
  );
  return log;
};

// ---------- run job ----------
const runTryOn = async (
  logId: string,
  userId: string,
  personS3Key: string,
  garments: ResolvedGarment[]
) => {
  const started = Date.now();
  const tempKeys: string[] = [];
  try {
    const config = await getTryOnConfig();
    const prompt = config.prompt_template.replace(
      "{garments}",
      garments.map((g) => g.description).join(", ")
    );

    const [person, canvas] = await Promise.all([
      preparePerson(personS3Key),
      composeGarmentCanvas(garments.flatMap((g) => g.keys)),
    ]);
    const stamp = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    const personTmp = `tryon-tmp/${userId}/${stamp}_person.jpg`;
    const garmentTmp = `tryon-tmp/${userId}/${stamp}_garment.jpg`;
    tempKeys.push(personTmp, garmentTmp);
    await Promise.all([putJpeg(personTmp, person), putJpeg(garmentTmp, canvas)]);
    const [personUrl, garmentUrl] = await Promise.all([
      getImageUrl(personTmp, 3600),
      getImageUrl(garmentTmp, 3600),
    ]);

    // ลอง provider หลัก ถ้าล้มด้วยสาเหตุที่ provider อื่นช่วยได้ (credit หมด/ล่ม/timeout) → ใช้ตัวสำรอง
    const order = getProviderOrder(config);

    let result: TryOnRunResult | null = null;
    let used: ProviderName = order[0];
    let lastError: TryOnProviderError | null = null;
    for (const provider of order) {
      try {
        result = await runProvider(provider, { personUrl, garmentUrl, prompt });
        used = provider;
        break;
      } catch (err) {
        lastError =
          err instanceof TryOnProviderError
            ? err
            : new TryOnProviderError(String(err), "PROVIDER_ERROR", true);
        console.error(`[tryon] ${provider} failed (${lastError.code}): ${lastError.message}`);
        if (!lastError.retryable) break;
      }
    }
    if (!result) throw lastError ?? new TryOnProviderError("no provider", "NO_PROVIDER", false);

    // URL ของ provider ไม่ถาวร → ดาวน์โหลดเก็บลง S3 ของเรา
    const res = await fetch(result.imageUrl);
    if (!res.ok) throw new TryOnProviderError(`download failed (${res.status})`, "DOWNLOAD_FAILED", false);
    const resultKey = `tryon/${userId}/${stamp}.jpg`;
    await putJpeg(resultKey, Buffer.from(await res.arrayBuffer()));

    await prisma.tryOnLog.update({
      where: { id: logId },
      data: {
        status: "SUCCESS",
        provider: used,
        model: result.model,
        request_id: result.requestId,
        prompt,
        cost: result.cost,
        result_s3_key: resultKey,
        duration_ms: Date.now() - started,
      },
    });
  } catch (err) {
    const code = err instanceof TryOnProviderError ? err.code : "INTERNAL_ERROR";
    console.error("[tryon] failed", logId, err);
    await prisma.tryOnLog
      .update({
        where: { id: logId },
        data: { status: "FAILED", error_code: code, duration_ms: Date.now() - started },
      })
      .catch(() => undefined);
  } finally {
    await Promise.all(tempKeys.map((k) => deleteImage(k).catch(() => undefined)));
  }
};

// ---------- read ----------
export const serializeTryOn = async (log: {
  id: string;
  status: string;
  error_code: string | null;
  view: ImageView | null;
  result_s3_key: string | null;
  created_at: Date;
}) => ({
  id: log.id,
  status: log.status,
  error_code: log.error_code,
  view: log.view?.toLowerCase() ?? null,
  image_url: log.result_s3_key ? await getImageUrl(log.result_s3_key) : null,
  created_at: log.created_at,
});
