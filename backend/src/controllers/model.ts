import { Request, Response } from "express";
import { Prisma, Gender } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getImageUrl, deleteImage } from "../utils/s3Utils";

// multer-s3 ใส่ key บน file — ประกาศเพิ่มให้ type-safe
interface MulterS3File extends Express.Multer.File {
  key: string;
}

const GENDERS: Gender[] = [Gender.MALE, Gender.FEMALE];

// สล็อตรูปโมเดล 4 มุม — image_front บังคับ อีก 3 มุมไม่บังคับ
const IMAGE_SLOTS = ["image_front", "image_back", "image_left", "image_right"] as const;
type ImageSlot = (typeof IMAGE_SLOTS)[number];

const isImageSlot = (value: string): value is ImageSlot =>
  (IMAGE_SLOTS as readonly string[]).includes(value);

/** เลือก key ของไฟล์จาก multer.fields() — คืน null ถ้าไม่มีไฟล์ในสล็อตนั้น */
const fileKey = (files: Record<string, unknown>, slot: ImageSlot): string | null => {
  const list = (files[slot] ?? []) as MulterS3File[];
  return list[0]?.key ?? null;
};

/** parse remove_images (JSON string ของสล็อตที่ผู้ใช้ล้างในโหมดแก้ไข) */
const parseRemoveSlots = (raw: unknown): ImageSlot[] => {
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter(isImageSlot) : [];
  } catch {
    return [];
  }
};

// ---------- helpers ----------

/** parse เงื่อนไขขนาด (ซม.) จาก string FormData — null/"" ได้ */
const parseOptionalMeasurement = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

/** แปลง Decimal จาก Prisma เป็น number เพื่อให้ JSON เป็นตัวเลขล้วน */
const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

type ModelRow = {
  id: string;
  name: string;
  gender: Gender | null;
  bust: Prisma.Decimal | null;
  waist: Prisma.Decimal | null;
  hips: Prisma.Decimal | null;
  height: Prisma.Decimal;
  image_front: string;
  image_back: string | null;
  image_left: string | null;
  image_right: string | null;
  supported_sizes: string[];
  is_active: boolean;
  is_selectable: boolean;
  created_at: Date;
};

/** รูปเก็บเป็น S3 key → แปลงเป็น presigned URL ให้ frontend ใช้แสดงรูปได้ทันที */
const serializeModel = async (model: ModelRow) => ({
  id: model.id,
  name: model.name,
  gender: model.gender,
  bust: toNumber(model.bust),
  waist: toNumber(model.waist),
  hips: toNumber(model.hips),
  height: toNumber(model.height),
  image_front: await getImageUrl(model.image_front),
  image_back: model.image_back ? await getImageUrl(model.image_back) : null,
  image_left: model.image_left ? await getImageUrl(model.image_left) : null,
  image_right: model.image_right ? await getImageUrl(model.image_right) : null,
  supported_sizes: model.supported_sizes,
  is_active: model.is_active,
  is_selectable: model.is_selectable,
  created_at: model.created_at,
});

/** validate + parse fields ที่มาจาก FormData (ทุกค่าเป็น string) */
const parseModelFields = (body: Record<string, any>) => {
  const errors: string[] = [];

  const name = String(body.name ?? "").trim();
  if (!name) errors.push("กรุณากรอกชื่อโมเดล");

  const genderRaw = String(body.gender ?? "").trim().toUpperCase();
  const gender: Gender | null =
    genderRaw === "" ? null : (genderRaw as Gender);
  if (gender && !GENDERS.includes(gender)) {
    errors.push("เพศไม่ถูกต้อง");
  }

  const bust = parseOptionalMeasurement(body.bust);
  const waist = parseOptionalMeasurement(body.waist);
  const hips = parseOptionalMeasurement(body.hips);
  const height = parseOptionalMeasurement(body.height);

  for (const [label, value] of [
    ["รอบอก", bust],
    ["รอบเอว", waist],
    ["รอบสะโพก", hips],
    ["ส่วนสูง", height],
  ] as const) {
    if (value !== null && (value < 20 || value > 300)) {
      errors.push(`${label}ต้องอยู่ระหว่าง 20–300 ซม.`);
    }
  }
  if (height === null) errors.push("กรุณากรอกส่วนสูง");

  // supported_sizes มาเป็น JSON string เช่น '["S","M"]'
  let supported_sizes: string[] = [];
  try {
    const raw = JSON.parse(String(body.supported_sizes ?? "[]"));
    if (Array.isArray(raw)) {
      supported_sizes = raw.map(String).filter(Boolean);
    }
  } catch {
    errors.push("รูปแบบไซส์ไม่ถูกต้อง");
  }

  const is_selectable = String(body.is_selectable ?? "true") !== "false";

  return {
    errors,
    data: {
      name,
      gender,
      bust,
      waist,
      hips,
      height: height ?? 0,
      supported_sizes,
      is_selectable,
    },
  };
};

/** ลบรูปเก่าออกจาก S3 (กัน throw ทำให้ request พัง) */
const safeDeleteImage = async (key: string) => {
  await deleteImage(key).catch((err) =>
    console.error("deleteImage (model image) error:", err)
  );
};

// ---------- controllers ----------

export const getModels = async (req: Request, res: Response) => {
  try {
    const models = await prisma.model.findMany({
      orderBy: { created_at: "desc" },
    });
    res.status(200).json(await Promise.all(models.map(serializeModel)));
  } catch (error) {
    console.error("getModels error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

export const createModel = async (req: Request, res: Response) => {
  try {
    const { errors, data } = parseModelFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(", ") });
    }

    const files = (req.files ?? {}) as Record<string, unknown>;
    const frontKey = fileKey(files, "image_front");
    if (!frontKey) {
      return res.status(400).json({ error: "กรุณาอัปโหลดรูปด้านหน้า" });
    }

    const model = await prisma.model.create({
      data: {
        ...data,
        image_front: frontKey,
        image_back: fileKey(files, "image_back"),
        image_left: fileKey(files, "image_left"),
        image_right: fileKey(files, "image_right"),
      },
    });
    res.status(201).json(await serializeModel(model));
  } catch (error) {
    console.error("createModel error:", error);
    res.status(500).json({ error: "Failed to create model" });
  }
};

export const updateModel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.model.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบโมเดลนี้" });
    }

    const { errors, data } = parseModelFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(", ") });
    }

    // จัดการรูปทีละมุม:
    // - มีไฟล์ใหม่ → ใช้ key ใหม่ และลบรูปเก่าออกจาก S3
    // - อยู่ใน remove_images (ผู้ใช้กดล้าง) → เป็น null และลบรูปเก่า
    // - อย่างอื่น → คงรูปเดิม (ไม่ส่ง field นั้นไป update)
    const files = (req.files ?? {}) as Record<string, unknown>;
    const removeSlots = parseRemoveSlots(req.body.remove_images);

    const oldKeys: Record<ImageSlot, string | null> = {
      image_front: existing.image_front,
      image_back: existing.image_back,
      image_left: existing.image_left,
      image_right: existing.image_right,
    };

    const imageUpdate: {
      image_front?: string;
      image_back?: string | null;
      image_left?: string | null;
      image_right?: string | null;
    } = {};
    const keysToDelete: string[] = [];
    for (const slot of IMAGE_SLOTS) {
      const newKey = fileKey(files, slot);
      if (newKey) {
        imageUpdate[slot] = newKey;
        if (oldKeys[slot] && oldKeys[slot] !== newKey) {
          keysToDelete.push(oldKeys[slot] as string);
        }
      } else if (removeSlots.includes(slot)) {
        if (slot === "image_front") {
          // รูปหน้าเป็นสล็อตบังคับ — ถ้าผู้ใช้ล้างโดยไม่เลือกรูปใหม่จะตรวจในข้อ 3
          continue;
        }
        imageUpdate[slot] = null;
        if (oldKeys[slot]) keysToDelete.push(oldKeys[slot] as string);
      }
    }

    if (!imageUpdate.image_front && removeSlots.includes("image_front")) {
      // รูปหน้าเป็นสล็อตบังคับ — error เฉพาะกรณีผู้ใช้ล้างรูปหน้าแล้วไม่เลือกรูปใหม่
      // (แก้เฉพาะชื่อ/สัดส่วน โดยไม่แตะรูป = คงรูปเดิม → ผ่าน)
      return res.status(400).json({ error: "กรุณาเลือกรูปด้านหน้าใหม่" });
    }

    const model = await prisma.model.update({
      where: { id },
      data: { ...data, ...imageUpdate },
    });

    await Promise.all(keysToDelete.map(safeDeleteImage));

    res.status(200).json(await serializeModel(model));
  } catch (error) {
    console.error("updateModel error:", error);
    res.status(500).json({ error: "Failed to update model" });
  }
};

export const updateModelStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { is_active, is_selectable } = req.body ?? {};

    if (
      (is_active === undefined && is_selectable === undefined) ||
      (is_active !== undefined && typeof is_active !== "boolean") ||
      (is_selectable !== undefined && typeof is_selectable !== "boolean")
    ) {
      return res
        .status(400)
        .json({ error: "ต้องส่ง is_active หรือ is_selectable เป็น boolean" });
    }

    const model = await prisma.model.update({
      where: { id },
      data: {
        ...(is_active !== undefined && { is_active }),
        ...(is_selectable !== undefined && { is_selectable }),
      },
    });
    res.status(200).json(await serializeModel(model));
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ error: "ไม่พบโมเดลนี้" });
    }
    console.error("updateModelStatus error:", error);
    res.status(500).json({ error: "Failed to update model status" });
  }
};

export const deleteModel = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.model.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "ไม่พบโมเดลนี้" });
    }

    await prisma.model.delete({ where: { id } });

    const keys = [existing.image_front, existing.image_back, existing.image_left, existing.image_right]
      .filter((key): key is string => Boolean(key));
    await Promise.all(keys.map(safeDeleteImage));

    res.status(200).json({ message: "ลบโมเดลเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("deleteModel error:", error);
    res.status(500).json({ error: "Failed to delete model" });
  }
};
