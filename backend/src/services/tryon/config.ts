import { prisma } from "../../../lib/prisma";
import { isProviderEnabled, PROVIDER_NAMES, ProviderName } from "./providers";

// config ของ try-on เก็บในตาราง ai_configs (key = "tryon") แก้ได้โดย super admin
// ค่าด้านล่างเป็นค่าเริ่มต้นเมื่อยังไม่มี row เท่านั้น
export type TryOnConfig = {
  provider: ProviderName; // ตัวหลัก (ค่าเริ่มต้น bfl = vto-v2)
  fallbacks: ProviderName[]; // ตัวสำรองตามลำดับ (ค่าเริ่มต้น fal vto v1 แล้ว fal flux-2/edit)
  prompt_template: string; // ใช้ {garments} แทนคำบรรยายชิ้นเสื้อผ้า
};

const DEFAULT_PROMPT =
  "The person of image 1, maintaining exactly their face and pose, wearing the {garments} of image 2.";

const asProvider = (v: unknown): ProviderName | null =>
  PROVIDER_NAMES.includes(v as ProviderName) ? (v as ProviderName) : null;

const DEFAULT_PRIMARY: ProviderName = "bfl";
const DEFAULT_FALLBACKS: ProviderName[] = ["fal", "fal-edit"];

const asProviderList = (v: unknown): ProviderName[] | null =>
  Array.isArray(v) ? v.map(asProvider).filter((p): p is ProviderName => p !== null) : null;

// ลำดับที่ใช้รันจริง: ตัวหลัก + ตัวสำรอง ตัดตัวซ้ำและตัวที่ไม่มี key ออก
// (ถ้ายังไม่ได้ใส่ BFL_API_KEY จะข้าม bfl ไปใช้ fal ให้เอง)
export const getProviderOrder = (config: TryOnConfig): ProviderName[] =>
  [config.provider, ...config.fallbacks].filter(
    (p, i, all) => all.indexOf(p) === i && isProviderEnabled(p)
  );

export const CONFIG_KEY = "tryon";

export const getTryOnConfig = async (): Promise<TryOnConfig> => {
  const row = await prisma.aiConfig.findUnique({ where: { key: CONFIG_KEY } });
  const stored = (row?.value ?? {}) as Partial<Record<keyof TryOnConfig, unknown>>;

  const provider = asProvider(stored.provider) ?? asProvider(process.env.TRYON_PROVIDER) ?? DEFAULT_PRIMARY;
  const fallbacks = (asProviderList(stored.fallbacks) ?? DEFAULT_FALLBACKS).filter((p) => p !== provider);

  return {
    provider,
    fallbacks,
    prompt_template:
      typeof stored.prompt_template === "string" && stored.prompt_template.includes("{garments}")
        ? stored.prompt_template
        : DEFAULT_PROMPT,
  };
};

export const saveTryOnConfig = async (
  input: Partial<TryOnConfig>,
  adminId: string
): Promise<TryOnConfig> => {
  const current = await getTryOnConfig();
  const next: TryOnConfig = {
    provider: asProvider(input.provider) ?? current.provider,
    fallbacks: asProviderList(input.fallbacks) ?? current.fallbacks,
    prompt_template:
      typeof input.prompt_template === "string" && input.prompt_template.includes("{garments}")
        ? input.prompt_template
        : current.prompt_template,
  };
  await prisma.aiConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: next, updated_by: adminId },
    update: { value: next, updated_by: adminId },
  });
  return next;
};
