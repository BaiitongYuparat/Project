import { fal } from "@fal-ai/client";

// ---------- Provider adapters สำหรับ virtual try-on ----------
// ทุก provider รับ input เดียวกัน (รูปคน 1 รูป + รูป garment 1 รูป ซึ่งอาจเป็น canvas ที่รวมหลายชิ้น)
// และคืนผลลัพธ์รูปแบบเดียวกัน → สลับ provider ได้ที่ config โดยไม่ต้องแก้ service

// bfl      = Black Forest Labs vto-v2 (ตัวหลัก)
// fal      = fal.ai flux-pro/v1/vto (v1) — ตัวสำรอง
// fal-edit = fal.ai flux-2/edit (editor ทั่วไป) — ตัวสำรองสุดท้าย
export type ProviderName = "bfl" | "fal" | "fal-edit";
export const PROVIDER_NAMES: readonly ProviderName[] = ["bfl", "fal", "fal-edit"];

export type TryOnRunInput = {
  personUrl: string;
  garmentUrl: string;
  prompt: string;
};

export type TryOnRunResult = {
  imageUrl: string; // URL ชั่วคราวของ provider — ต้องดาวน์โหลดเก็บลง S3 ทันที
  requestId: string | null;
  model: string;
  cost: number; // USD (fal = ประมาณการจากเรตที่ประกาศ, bfl = จาก credit ที่ API ส่งกลับ)
};

export class TryOnProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    // true = ปัญหาที่ provider อื่นอาจช่วยได้ (credit หมด, ล่ม, timeout) → ลอง fallback
    public readonly retryable: boolean
  ) {
    super(message);
  }
}

export const FAL_MODEL = process.env.FAL_TRYON_MODEL ?? "fal-ai/flux-pro/v1/vto";
export const FAL_EDIT_MODEL = process.env.FAL_EDIT_MODEL ?? "fal-ai/flux-2/edit";
export const BFL_MODEL = process.env.BFL_TRYON_MODEL ?? "vto-v2";
const BFL_BASE = (process.env.BFL_API_BASE ?? "https://api.bfl.ai").replace(/\/$/, "");

export const isFalEnabled = Boolean(process.env.FAL_KEY);
export const isBflEnabled = Boolean(process.env.BFL_API_KEY);

if (isFalEnabled) fal.config({ credentials: process.env.FAL_KEY });

export const isProviderEnabled = (p: ProviderName) =>
  p === "bfl" ? isBflEnabled : isFalEnabled;

// ประมาณราคา fal จาก pricing ที่ประกาศ: $0.0375 input MP แรก + $0.005 ต่อ MP ที่เพิ่ม + $0.005 ต่อ output MP
// (รูปที่ส่งเข้ามาถูกย่อให้ ≤1MP แล้ว → input 2 รูป + output 1 MP ≈ $0.0475)
const FAL_ESTIMATED_COST = 0.0475;
// flux-2/edit: $0.012 ต่อ MP ของ input+output — รูปเข้า 2 รูป (ย่อเหลือ ≈1MP) + output ≈1MP
const FAL_EDIT_ESTIMATED_COST = 0.036;
// timeout ต่อ provider — รวมกรณีเลวร้ายสุด (ล้มทั้ง 3 ตัว) ต้องไม่เกินเวลาที่หน้าเว็บ poll (4 นาที)
// เวลาจริงที่วัดได้: bfl ≈17s, fal vto ≈10s, fal flux-2/edit ≈42s → 60 + 60 + 90 = 210s
const BFL_TIMEOUT_MS = 60_000;
const FAL_VTO_TIMEOUT_MS = 60_000;
const FAL_EDIT_TIMEOUT_MS = 90_000;
const BFL_POLL_MS = 1_500;
// BFL: 1 credit = $0.01
const BFL_USD_PER_CREDIT = 0.01;

// ---------------- fal.ai ----------------
const runFal = async (
  input: TryOnRunInput,
  kind: "vto" | "edit" = "vto"
): Promise<TryOnRunResult> => {
  const model = kind === "vto" ? FAL_MODEL : FAL_EDIT_MODEL;
  const estimatedCost = kind === "vto" ? FAL_ESTIMATED_COST : FAL_EDIT_ESTIMATED_COST;
  if (!isFalEnabled) {
    throw new TryOnProviderError("FAL_KEY is not set", "FAL_DISABLED", true);
  }
  try {
    const result = await fal.subscribe(model, {
      input:
        kind === "vto"
          ? {
              prompt: input.prompt,
              human_image_url: input.personUrl,
              garment_image_url: input.garmentUrl,
              output_format: "jpeg",
            }
          : {
              // image 1 = คน, image 2 = canvas เสื้อผ้า (prompt อ้างอิงตามลำดับนี้)
              prompt: input.prompt,
              image_urls: [input.personUrl, input.garmentUrl],
              output_format: "jpeg",
            },
      timeout: kind === "vto" ? FAL_VTO_TIMEOUT_MS : FAL_EDIT_TIMEOUT_MS,
    });
    const data = result.data as { images?: { url: string }[] };
    const url = data.images?.[0]?.url;
    if (!url) {
      throw new TryOnProviderError("fal returned no image", "FAL_NO_IMAGE", true);
    }
    return {
      imageUrl: url,
      requestId: result.requestId ?? null,
      model,
      cost: estimatedCost,
    };
  } catch (err) {
    if (err instanceof TryOnProviderError) throw err;
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : String(err);
    // 401/403 = key ผิดหรือ credit หมด, 429/5xx = ล่ม/ติด rate limit → ให้ fallback ทำงาน
    if (status === 401 || status === 403) {
      throw new TryOnProviderError(message, "FAL_AUTH_OR_CREDIT", true);
    }
    if (status === 422) {
      // input ไม่ผ่าน (เช่น safety checker) — เปลี่ยน provider ก็ไม่ช่วย
      throw new TryOnProviderError(message, "FAL_INVALID_INPUT", false);
    }
    throw new TryOnProviderError(message, "FAL_ERROR", true);
  }
};

// ---------------- Black Forest Labs (api.bfl.ai) ----------------
// POST {base}/v1/flux-tools/{vto-v2} → { id, polling_url, cost? } แล้ว poll polling_url จน status = "Ready"
// หมายเหตุ: ยังไม่ได้ทดสอบกับ key จริง — ตรวจ field จาก docs.bfl.ai/api-reference/models/virtual-try-on
const runBfl = async (input: TryOnRunInput): Promise<TryOnRunResult> => {
  if (!isBflEnabled) {
    throw new TryOnProviderError("BFL_API_KEY is not set", "BFL_DISABLED", true);
  }
  const headers = {
    "x-key": process.env.BFL_API_KEY!,
    "Content-Type": "application/json",
    accept: "application/json",
  };

  const submit = await fetch(`${BFL_BASE}/v1/flux-tools/${BFL_MODEL}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: input.prompt,
      person: input.personUrl,
      garment: input.garmentUrl,
      output_format: "jpeg",
    }),
  });
  if (!submit.ok) {
    const body = await submit.text().catch(() => "");
    const retryable = submit.status !== 422 && submit.status !== 400;
    throw new TryOnProviderError(
      `BFL submit failed (${submit.status}) ${body.slice(0, 200)}`,
      submit.status === 402 || submit.status === 403 ? "BFL_AUTH_OR_CREDIT" : "BFL_ERROR",
      retryable
    );
  }
  const job = (await submit.json()) as { id: string; polling_url?: string; cost?: number };
  const pollUrl = job.polling_url ?? `${BFL_BASE}/v1/get_result?id=${job.id}`;

  const deadline = Date.now() + BFL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, BFL_POLL_MS));
    const res = await fetch(pollUrl, { headers: { "x-key": headers["x-key"], accept: "application/json" } });
    if (!res.ok) continue; // ผิดพลาดชั่วคราว ลองใหม่จนหมดเวลา
    const data = (await res.json()) as { status: string; result?: { sample?: string } };
    if (data.status === "Ready") {
      const url = data.result?.sample;
      if (!url) throw new TryOnProviderError("BFL returned no image", "BFL_NO_IMAGE", true);
      return {
        imageUrl: url,
        requestId: job.id,
        model: `bfl/${BFL_MODEL}`,
        cost: typeof job.cost === "number" ? job.cost * BFL_USD_PER_CREDIT : 0,
      };
    }
    if (data.status === "Pending" || data.status === "Queued" || data.status === "Processing") continue;
    // Error / Failed / Content Moderated / Request Moderated ...
    const moderated = /moderated/i.test(data.status);
    throw new TryOnProviderError(`BFL status: ${data.status}`, moderated ? "BFL_MODERATED" : "BFL_FAILED", !moderated);
  }
  throw new TryOnProviderError("BFL timeout", "BFL_TIMEOUT", true);
};

export const runProvider = (provider: ProviderName, input: TryOnRunInput) => {
  switch (provider) {
    case "bfl":
      return runBfl(input);
    case "fal":
      return runFal(input, "vto");
    case "fal-edit":
      return runFal(input, "edit");
  }
};
