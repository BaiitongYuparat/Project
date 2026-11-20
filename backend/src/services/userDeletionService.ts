import { prisma } from "../../lib/prisma";
import { deleteImage, toS3Key } from "../utils/s3Utils";

// ลบบัญชี shopper พร้อมข้อมูลทั้งหมด (แถวใน DB + ไฟล์ใน S3)
// - ตารางที่ cascade อยู่แล้ว (body/image, consent, body_type, appeal, ai_report,
//   BrandCustomer, favorite) จะหายไปพร้อม user.delete
// - clothings ไม่มี relation, try_on_logs/product_clicks เป็น SetNull → ต้องลบเอง
export const purgeUser = async (userId: string): Promise<void> => {
  const [bodyImages, clothings, reports, tryOns] = await Promise.all([
    prisma.image.findMany({ where: { body: { user_id: userId } }, select: { s3: true } }),
    prisma.clothing.findMany({ where: { user_id: userId }, select: { image_url: true } }),
    prisma.aiReport.findMany({ where: { user_id: userId }, select: { image_url: true } }),
    prisma.tryOnLog.findMany({ where: { user_id: userId }, select: { result_s3_key: true } }),
  ]);

  const keys = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (value) keys.add(toS3Key(value));
  };
  bodyImages.forEach((i) => add(i.s3));
  clothings.forEach((c) => add(c.image_url));
  reports.forEach((r) => add(r.image_url));
  tryOns.forEach((t) => add(t.result_s3_key));

  await prisma.$transaction([
    prisma.clothing.deleteMany({ where: { user_id: userId } }),
    prisma.tryOnLog.deleteMany({ where: { user_id: userId } }),
    prisma.productClick.deleteMany({ where: { user_id: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // ลบไฟล์หลัง commit แบบ best-effort — ไฟล์ที่ลบไม่ได้แค่ log ไว้
  const results = await Promise.allSettled([...keys].map((key) => deleteImage(key)));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Failed to delete S3 object of deleted user:", [...keys][index], result.reason);
    }
  });
};
