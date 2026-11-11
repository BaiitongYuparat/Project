// สคริปต์ทดสอบ: ลบ user ที่มีข้อมูลเกี่ยวข้อง (body, body_type, product_click)
// รัน: npx tsx scripts/test-delete-user.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = `fk-test-${Date.now()}@example.com`;

  const user = await prisma.user.create({ data: { email } });
  console.log("created user:", user.id);

  await prisma.body.create({
    data: { user_id: user.id, height: 170, weight: 60, chest: 34, waist: 28, hips: 38 },
  });
  await prisma.bodyType.create({
    data: { user_id: user.id, body_type: "hourglass", description: "test" },
  });

  const brand = await prisma.brand.findFirst();
  if (brand) {
    await prisma.productClick.create({ data: { user_id: user.id, brand_id: brand.id } });
  }
  const clickId = (
    await prisma.productClick.findFirst({ where: { user_id: user.id } })
  )?.id;

  console.log("related rows created: body, body_type, product_click");

  // ลบ user — ก่อนหน้านี้ติด FK restrict (RESTRICT ที่ body_type)
  await prisma.user.delete({ where: { id: user.id } });
  console.log("user deleted: OK");

  const bodyCount = await prisma.body.count({ where: { user_id: user.id } });
  const bodyType = await prisma.bodyType.findUnique({ where: { user_id: user.id } });
  const click = clickId
    ? await prisma.productClick.findUnique({ where: { id: clickId } })
    : null;

  console.log("body rows left (cascade):", bodyCount);
  console.log("body_type left (cascade):", bodyType);
  console.log("product_click.user_id after delete (set null):", click?.user_id ?? null);

  const pass =
    bodyCount === 0 && bodyType === null && (!clickId || click?.user_id === null);
  console.log(pass ? "✅ TEST PASSED" : "❌ TEST FAILED");
  if (!pass) process.exit(1);
}

main()
  .catch((e) => {
    console.error("❌ TEST FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
