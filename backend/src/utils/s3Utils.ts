import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../middlewares/upload";

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

// ---------- presigned URL cache ----------
// รูปของระบบนี้ key มี timestamp + เลขสุ่ม และไม่มีการเขียนทับ key เดิมเลย
// จึงต้องการให้ URL (รวม query signature) "นิ่ง" เพื่อให้ browser cache รูปได้ยาว:
// - ปัดเวลา sign ลงเป็น bucket 10 นาที + ส่ง signingDate → signature เป็น deterministic
//   URL ภายใน bucket เดียวกันจึงเหมือนกันทุก instance / ทุก restart
// - reuse URL จนใกล้หมดอายุ (เหลือ SAFETY_MS) → URL นิ่งได้นานเกือบ expiresIn
const SIGN_BUCKET_MS = 10 * 60 * 1000;
// อย่าใช้ URL ที่เหลืออายุน้อยกว่านี้ (กัน browser เอาไปใช้ช่วงกำลังหมดอายุพอดี)
const SAFETY_MS = 10 * 60 * 1000;
// จำกัดขนาด cache กันโตไม่จำกัด (รูปหลายหมื่น key)
const PRESIGN_CACHE_MAX = 20000;

type PresignEntry = { url: string; validUntil: number };

const presignCache = new Map<string, PresignEntry>();
// single-flight ต่อ key — กัน sign URL เดียวกันพร้อมกันหลาย request
const presignInFlight = new Map<string, Promise<string>>();

const presignCacheKey = (key: string, expiresIn: number) => `${key}:${expiresIn}`;

// ตอน set ถ้าเกินขนาด → ล้างตัวหมดอายุก่อน ยังเกินอีกค่อยทิ้งตัวเก่าสุด (Map iterate ตามลำดับแทรก)
const evictPresignCache = (now: number) => {
  if (presignCache.size < PRESIGN_CACHE_MAX) return;

  for (const [cacheKey, entry] of presignCache) {
    if (entry.validUntil <= now) presignCache.delete(cacheKey);
  }

  while (presignCache.size >= PRESIGN_CACHE_MAX) {
    const oldest = presignCache.keys().next().value;
    if (oldest === undefined) break;
    presignCache.delete(oldest);
  }
};

const evictKey = (key: string) => {
  for (const cacheKey of presignCache.keys()) {
    // cacheKey = `${key}:${expiresIn}` — key ไม่มี ":" จึง match ด้วย prefix ได้
    if (cacheKey === key || cacheKey.startsWith(`${key}:`)) {
      presignCache.delete(cacheKey);
    }
  }
};

// สร้าง URL สำหรับดูรูปภาพ (มี cache + single-flight → URL นิ่ง ไม่ presign ซ้ำทุก request)
export const getImageUrl = async (
  key: string,
  expiresIn: number = 86400
): Promise<string> => {
  const cacheKey = presignCacheKey(key, expiresIn);
  const now = Date.now();

  const cached = presignCache.get(cacheKey);
  if (cached && now < cached.validUntil) {
    return cached.url;
  }

  const inFlight = presignInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // sign ด้วยเวลาที่ปัดลง bucket — URL ที่ได้จึงซ้ำกับ instance อื่นใน bucket เดียวกันได้
  const signingDate = new Date(Math.floor(now / SIGN_BUCKET_MS) * SIGN_BUCKET_MS);

  const promise = getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      // บังคับ Cache-Control ตอน response — ใช้ได้กับรูปเก่าที่อัปโหลดก่อนเปิดใช้ด้วย
      // (key ไม่มีการเขียนทับ จึงปลอดภัยที่จะให้ browser cache ยาว)
      ResponseCacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn, signingDate }
  )
    .then((url) => {
      evictPresignCache(Date.now());
      presignCache.set(cacheKey, {
        url,
        validUntil: signingDate.getTime() + expiresIn * 1000 - SAFETY_MS,
      });
      return url;
    })
    .finally(() => {
      if (presignInFlight.get(cacheKey) === promise) {
        presignInFlight.delete(cacheKey);
      }
    });

  presignInFlight.set(cacheKey, promise);

  return promise;
};

// ลบรูปภาพจาก S3
export const deleteImage = async (key: string): Promise<void> => {
  // เคลียร์ URL ที่ cache ไว้ของ key นี้ด้วย
  evictKey(key);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
};
